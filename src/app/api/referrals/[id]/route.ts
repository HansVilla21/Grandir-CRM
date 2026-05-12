import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

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
    const { action, receipt_path } = body as {
      action?: string
      receipt_path?: string
    }

    // Fetch commission to verify it exists
    const { data: existing, error: fetchError } = await adminSupabase
      .from('referral_commissions')
      .select('id, paid')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Comisión no encontrada' }, { status: 404 })
    }

    if (action === 'pay') {
      if (existing.paid) {
        return NextResponse.json(
          { error: 'Esta comisión ya fue marcada como pagada' },
          { status: 400 }
        )
      }

      const { data: commission, error: updateError } = await adminSupabase
        .from('referral_commissions')
        .update({
          paid: true,
          paid_at: new Date().toISOString(),
          receipt_path: receipt_path ?? null,
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // Notify OTHER admins
      try {
        const { notifyAdmins } = await import('@/lib/notifications/notify-admins')
        const { data: referrer } = await adminSupabase
          .from('investors')
          .select('full_name')
          .eq('id', commission.referrer_id)
          .single()
        const formattedAmount = `$${commission.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
        await notifyAdmins({
          supabase: adminSupabase,
          type: 'approval',
          channel: 'internal',
          title: 'Comisión de referido pagada',
          body: `Se pagó una comisión de ${formattedAmount} a ${referrer?.full_name ?? 'un inversionista'}.`,
          investor_id: commission.referrer_id,
          exclude_user_id: user.id,
        })
      } catch (notifErr) {
        console.error('[referrals/pay] notify error:', notifErr)
      }

      return NextResponse.json({ commission })
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
