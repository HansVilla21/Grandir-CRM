import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { ReferralCommissionItem, ReferralSummary } from '@/types/referrals'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)

    const paidParam = searchParams.get('paid')
    const referrerId = searchParams.get('referrer_id')

    // Fetch all commissions with joined data
    let query = supabase
      .from('referral_commissions')
      .select(`
        id,
        referrer_id,
        referred_id,
        contract_id,
        amount,
        paid,
        paid_at,
        receipt_path,
        created_at,
        referrer:investors!referral_commissions_referrer_id_fkey(full_name),
        referred:investors!referral_commissions_referred_id_fkey(full_name),
        contract:contracts(
          amount,
          plan:investment_plans(name)
        )
      `)
      .order('created_at', { ascending: false })

    if (paidParam !== null) {
      query = query.eq('paid', paidParam === 'true')
    }

    if (referrerId) {
      query = query.eq('referrer_id', referrerId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = data ?? []

    const commissions: ReferralCommissionItem[] = rows.map((row) => {
      const referrer = row.referrer as { full_name: string } | null
      const referred = row.referred as { full_name: string } | null
      const contract = row.contract as {
        amount: number
        plan: { name: string } | null
      } | null

      return {
        id: row.id,
        referrer_id: row.referrer_id,
        referrer_name: referrer?.full_name ?? '—',
        referred_id: row.referred_id,
        referred_name: referred?.full_name ?? '—',
        contract_id: row.contract_id,
        contract_amount: contract?.amount ?? 0,
        plan_name: contract?.plan?.name ?? '—',
        amount: row.amount,
        paid: row.paid,
        paid_at: row.paid_at,
        receipt_path: row.receipt_path,
        created_at: row.created_at,
      }
    })

    // Build summary
    const referrerIds = new Set(commissions.map((c) => c.referrer_id))
    const summary: ReferralSummary = {
      total_referrers: referrerIds.size,
      total_commissions: commissions.reduce((sum, c) => sum + c.amount, 0),
      pending_commissions: commissions
        .filter((c) => !c.paid)
        .reduce((sum, c) => sum + c.amount, 0),
      paid_commissions: commissions
        .filter((c) => c.paid)
        .reduce((sum, c) => sum + c.amount, 0),
    }

    return NextResponse.json({ commissions, summary })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminSupabase = await createAdminClient()
    const authClient = await createClient()

    const {
      data: { user },
    } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { referrer_id, referred_id, contract_id, amount } = body as {
      referrer_id?: string
      referred_id?: string
      contract_id?: string
      amount?: number
    }

    if (!referrer_id || !referred_id || !contract_id || amount === undefined) {
      return NextResponse.json(
        { error: 'referrer_id, referred_id, contract_id y amount son requeridos' },
        { status: 400 }
      )
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'El monto debe ser un número positivo' }, { status: 400 })
    }

    // Validate that referred investor has referrer_id matching referrer_id param
    const { data: referred, error: referredError } = await adminSupabase
      .from('investors')
      .select('id, referrer_id')
      .eq('id', referred_id)
      .single()

    if (referredError || !referred) {
      return NextResponse.json({ error: 'Inversionista referido no encontrado' }, { status: 404 })
    }

    if (referred.referrer_id !== referrer_id) {
      return NextResponse.json(
        { error: 'El inversionista referido no tiene ese referidor registrado' },
        { status: 400 }
      )
    }

    // Validate contract exists
    const { data: contract, error: contractError } = await adminSupabase
      .from('contracts')
      .select('id')
      .eq('id', contract_id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }

    const { data: commission, error: insertError } = await adminSupabase
      .from('referral_commissions')
      .insert({
        referrer_id,
        referred_id,
        contract_id,
        amount,
        paid: false,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ commission }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
