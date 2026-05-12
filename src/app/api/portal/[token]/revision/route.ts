import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // Parsear y validar body
  let body: { comment?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  const comment = body?.comment
  if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'El comentario es requerido.' },
      { status: 422 }
    )
  }
  if (comment.length > 2000) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'El comentario no puede superar los 2000 caracteres.' },
      { status: 422 }
    )
  }

  const supabase = createServiceClient()

  // Buscar contract_investor por token
  const { data: contractInvestor, error: ciError } = await supabase
    .from('contract_investors')
    .select('id, contract_id, investor_id, approval_status, token_expires_at')
    .eq('portal_token', token)
    .single()

  if (ciError || !contractInvestor) {
    return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 404 })
  }

  // Verificar expiración
  if (
    contractInvestor.token_expires_at &&
    new Date(contractInvestor.token_expires_at) < new Date()
  ) {
    return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 404 })
  }

  if (contractInvestor.approval_status !== 'pending') {
    return NextResponse.json(
      { error: 'ALREADY_PROCESSED', message: 'Este contrato ya fue procesado.' },
      { status: 400 }
    )
  }

  // Actualizar approval_status en contract_investors
  const { error: updateCiError } = await supabase
    .from('contract_investors')
    .update({
      approval_status: 'revision_requested',
      revision_comment: comment,
    })
    .eq('id', contractInvestor.id)

  if (updateCiError) {
    return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 })
  }

  // Actualizar estado del contrato
  const { error: updateContractError } = await supabase
    .from('contracts')
    .update({
      status: 'revision_requested',
      updated_at: new Date().toISOString(),
    })
    .eq('id', contractInvestor.contract_id)

  if (updateContractError) {
    return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 })
  }

  // Notify admins of revision request
  try {
    const { data: investor } = await supabase
      .from('investors')
      .select('full_name')
      .eq('id', contractInvestor.investor_id)
      .single()

    const { notifyAdmins } = await import('@/lib/notifications/notify-admins')
    const truncated = comment.length > 100 ? `${comment.slice(0, 100)}...` : comment
    await notifyAdmins({
      supabase,
      type: 'revision_request',
      channel: 'both',
      title: 'Revisión solicitada',
      body: `${investor?.full_name ?? 'Un inversionista'} solicitó cambios al contrato #${contractInvestor.contract_id.slice(0, 8).toUpperCase()}: "${truncated}"`,
      contract_id: contractInvestor.contract_id,
      investor_id: contractInvestor.investor_id,
    })
  } catch (notifyError) {
    console.error('[revision] notify error:', notifyError)
  }

  return NextResponse.json({ success: true })
}
