import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { requireInternalUser } from '@/lib/auth/guard'

/**
 * Permite al admin (April) rechazar un contrato que ya fue firmado por el
 * inversionista pero que necesita correcciones antes de que ella lo firme.
 * El contrato vuelve a 'draft' y se limpia la firma del inversionista,
 * para que ella corrija lo necesario y luego lo reenvíe.
 *
 * Body esperado: { reason: string } — comentario que se guarda en revision_comment
 * para que el inversionista vea el motivo cuando re-firme.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireInternalUser()
    if (response) return response

    const { id: contractId } = await params
    const authClient = await createClient()
    const supabase = createServiceClient()

    const {
      data: { user },
    } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden rechazar.' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const reason = ((body?.reason ?? '') as string).trim()

    if (!reason) {
      return NextResponse.json(
        { error: 'El motivo del rechazo es requerido.' },
        { status: 400 }
      )
    }

    if (reason.length > 500) {
      return NextResponse.json(
        { error: 'El motivo es demasiado largo (máximo 500 caracteres).' },
        { status: 400 }
      )
    }

    // Verify state
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, status')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }

    if (contract.status !== 'pending_admin_signature') {
      return NextResponse.json(
        { error: 'Solo se pueden rechazar contratos que están esperando tu firma.' },
        { status: 422 }
      )
    }

    // 1. Reset contract status back to draft
    const { error: contractUpdateError } = await supabase
      .from('contracts')
      .update({
        status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', contractId)
      .eq('status', 'pending_admin_signature')

    if (contractUpdateError) {
      console.error('[reject-signature] Error updating contract:', contractUpdateError)
      return NextResponse.json(
        { error: 'Error al rechazar el contrato.' },
        { status: 500 }
      )
    }

    // 2. Reset investor signatures so they have to firmar de nuevo después
    //    de los cambios; save the reason in revision_comment.
    const { error: ciUpdateError } = await supabase
      .from('contract_investors')
      .update({
        approval_status: 'revision_requested',
        revision_comment: reason,
        signature_name: null,
        signature_cedula: null,
        signature_ip: null,
        signature_user_agent: null,
        signed_at: null,
        approved_at: null,
      })
      .eq('contract_id', contractId)

    if (ciUpdateError) {
      console.error('[reject-signature] Error resetting contract_investors:', ciUpdateError)
      // No es bloqueante; el contrato ya volvió a draft
    }

    // 3. Notify other admins (optional — for transparency on a team)
    try {
      const { notifyAdmins } = await import('@/lib/notifications/notify-admins')
      await notifyAdmins({
        supabase,
        type: 'revision_request',
        channel: 'internal',
        title: 'Firma rechazada',
        body: `Se rechazó la firma del contrato #${contractId.slice(0, 8).toUpperCase()}. Motivo: ${reason.slice(0, 120)}${reason.length > 120 ? '…' : ''}`,
        contract_id: contractId,
        exclude_user_id: user.id,
      })
    } catch (notifErr) {
      console.error('[reject-signature] notify error:', notifErr)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[reject-signature] Unhandled error:', err)
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
