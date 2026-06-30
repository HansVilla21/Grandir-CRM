import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireInternalUser } from '@/lib/auth/guard'
import type { PaymentType } from '@/types/payments'

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireInternalUser()
    if (response) return response

    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)

    const contractId = searchParams.get('contract_id')
    const typeParam = searchParams.get('type') as PaymentType | null
    const verifiedParam = searchParams.get('verified')
    const search = searchParams.get('search')

    // Fetch payments with contract + plan
    const { data: paymentsRaw, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id, contract_id, amount, type, payment_date, receipt_path,
        verified, verified_at, notes, created_at,
        contract:contracts(
          id,
          plan:investment_plans(name)
        )
      `)
      .order('payment_date', { ascending: false })

    if (paymentsError) {
      return NextResponse.json({ error: paymentsError.message }, { status: 500 })
    }

    const payments = paymentsRaw ?? []

    if (payments.length === 0) {
      return NextResponse.json({ payments: [], summary: buildSummary([]) })
    }

    // Fetch holders for all contracts referenced by these payments
    const contractIds = [...new Set(payments.map((p) => p.contract_id))]

    const { data: holdersRaw, error: holdersError } = await supabase
      .from('contract_investors')
      .select('contract_id, investor:investors(full_name)')
      .in('contract_id', contractIds)
      .eq('role', 'holder')

    if (holdersError) {
      return NextResponse.json({ error: holdersError.message }, { status: 500 })
    }

    const holderMap = new Map<string, string>()
    for (const row of holdersRaw ?? []) {
      const inv = row.investor as { full_name: string } | null
      holderMap.set(row.contract_id, inv?.full_name ?? '—')
    }

    // Compose and filter
    type PaymentRow = (typeof payments)[number]

    const result = payments
      .map((p: PaymentRow) => {
        const contract = p.contract as { id: string; plan: { name: string } | null } | null
        const holderName = holderMap.get(p.contract_id) ?? '—'
        const planName = contract?.plan?.name ?? '—'

        if (contractId && p.contract_id !== contractId) return null
        if (typeParam && p.type !== typeParam) return null
        if (verifiedParam !== null) {
          const wantVerified = verifiedParam === 'true'
          if (p.verified !== wantVerified) return null
        }
        if (search) {
          const q = search.toLowerCase()
          if (!holderName.toLowerCase().includes(q)) return null
        }

        return {
          id: p.id,
          contract_id: p.contract_id,
          holder_name: holderName,
          plan_name: planName,
          amount: p.amount,
          type: p.type,
          payment_date: p.payment_date,
          receipt_path: p.receipt_path,
          verified: p.verified,
          verified_at: p.verified_at,
          notes: p.notes,
          created_at: p.created_at,
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      payments: result,
      summary: buildSummary(result as { amount: number; type: string; verified: boolean }[]),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function buildSummary(
  payments: { amount: number; type: string; verified: boolean }[]
) {
  return {
    total_deposited: payments
      .filter((p) => p.type === 'deposit' && p.verified)
      .reduce((sum, p) => sum + p.amount, 0),
    total_withdrawn: payments
      .filter((p) => p.type === 'withdrawal' && p.verified)
      .reduce((sum, p) => sum + p.amount, 0),
    total_commissions: payments
      .filter((p) => p.type === 'commission' && p.verified)
      .reduce((sum, p) => sum + p.amount, 0),
    pending_verification: payments.filter((p) => !p.verified).length,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireInternalUser()
    if (response) return response

    const adminSupabase = createServiceClient()

    const formData = await request.formData()

    const contractId = formData.get('contract_id') as string | null
    const amountRaw = formData.get('amount') as string | null
    const type = formData.get('type') as PaymentType | null
    const paymentDate = formData.get('payment_date') as string | null
    const notes = formData.get('notes') as string | null
    const receiptFile = formData.get('receipt') as File | null

    if (!contractId || !amountRaw || !type || !paymentDate) {
      return NextResponse.json(
        { error: 'contract_id, amount, type y payment_date son requeridos' },
        { status: 400 }
      )
    }

    const amount = parseFloat(amountRaw)
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'El monto debe ser un número positivo' }, { status: 400 })
    }

    // Upload receipt if provided
    let receiptPath: string | null = null
    if (receiptFile && receiptFile.size > 0) {
      const timestamp = Date.now()
      const safeName = receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${contractId}/${timestamp}_${safeName}`

      const arrayBuffer = await receiptFile.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)

      const { error: uploadError } = await adminSupabase.storage
        .from('receipts')
        .upload(storagePath, buffer, {
          contentType: receiptFile.type || 'application/octet-stream',
          upsert: false,
        })

      if (uploadError) {
        return NextResponse.json(
          { error: `Error al subir comprobante: ${uploadError.message}` },
          { status: 500 }
        )
      }

      receiptPath = storagePath
    }

    // Insert payment
    const { data: payment, error: insertError } = await adminSupabase
      .from('payments')
      .insert({
        contract_id: contractId,
        amount,
        type,
        payment_date: paymentDate,
        notes: notes?.trim() || null,
        receipt_path: receiptPath,
        verified: false,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ payment }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
