import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminSupabase = await createAdminClient()
    const authClient = await createClient()

    const {
      data: { user },
    } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body as { action?: string }

    // Fetch the payment to check current state
    const { data: existing, error: fetchError } = await adminSupabase
      .from('payments')
      .select('id, verified')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }

    if (action === 'verify') {
      // Verify the payment
      const { data: payment, error: updateError } = await adminSupabase
        .from('payments')
        .update({
          verified: true,
          verified_at: new Date().toISOString(),
          verified_by: user.id,
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // Notify OTHER admins (excluding the one who verified)
      try {
        const { notifyAdmins } = await import('@/lib/notifications/notify-admins')
        const { data: holderRow } = await adminSupabase
          .from('contract_investors')
          .select('investor:investors(full_name)')
          .eq('contract_id', payment.contract_id)
          .eq('role', 'holder')
          .single()
        const inv = holderRow?.investor as { full_name: string } | null
        const formattedAmount = `$${payment.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
        const typeLabel = payment.type === 'deposit' ? 'Depósito' : payment.type === 'withdrawal' ? 'Retiro' : 'Comisión'
        await notifyAdmins({
          supabase: adminSupabase,
          type: 'approval',
          channel: 'internal',
          title: 'Pago verificado',
          body: `${typeLabel} de ${formattedAmount} ${inv ? `(${inv.full_name})` : ''} fue verificado.`,
          contract_id: payment.contract_id,
          exclude_user_id: user.id,
        })
      } catch (notifErr) {
        console.error('[payments/verify] notify error:', notifErr)
      }

      return NextResponse.json({ payment })
    }

    // Update fields — only allowed if not verified
    if (existing.verified) {
      return NextResponse.json(
        { error: 'No se puede modificar un pago ya verificado' },
        { status: 400 }
      )
    }

    const { amount, notes, payment_date } = body as {
      amount?: number
      notes?: string | null
      payment_date?: string
    }

    const updateData: Record<string, unknown> = {}
    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        return NextResponse.json({ error: 'El monto debe ser positivo' }, { status: 400 })
      }
      updateData.amount = amount
    }
    if (notes !== undefined) updateData.notes = notes?.trim() || null
    if (payment_date !== undefined) updateData.payment_date = payment_date

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 })
    }

    const { data: payment, error: updateError } = await adminSupabase
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ payment })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminSupabase = await createAdminClient()
    const authClient = await createClient()

    const {
      data: { user },
    } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Fetch to verify it exists and is not verified
    const { data: existing, error: fetchError } = await adminSupabase
      .from('payments')
      .select('id, verified, receipt_path')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }

    if (existing.verified) {
      return NextResponse.json(
        { error: 'No se puede eliminar un pago ya verificado' },
        { status: 400 }
      )
    }

    // Delete from storage if there's a receipt
    if (existing.receipt_path) {
      await adminSupabase.storage.from('receipts').remove([existing.receipt_path])
    }

    const { error: deleteError } = await adminSupabase
      .from('payments')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
