import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createAdminClient()

  const { data: bulletin, error } = await supabase
    .from('bulletins')
    .select(`
      id,
      subject,
      body,
      status,
      target_group,
      target_plan_id,
      sent_at,
      created_at,
      investment_plans:target_plan_id ( name ),
      bulletin_recipients (
        id,
        investor_id,
        email,
        delivered,
        opened,
        created_at
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ error: error.message }, { status })
  }

  const plan = bulletin.investment_plans as { name: string } | null
  const recipients = bulletin.bulletin_recipients as Array<{
    id: string
    investor_id: string
    email: string
    delivered: boolean
    opened: boolean
    created_at: string
  }> | null

  return NextResponse.json({
    bulletin: {
      id: bulletin.id,
      subject: bulletin.subject,
      body: bulletin.body,
      status: bulletin.status,
      target_group: bulletin.target_group,
      target_plan_id: bulletin.target_plan_id,
      target_plan_name: plan?.name ?? null,
      recipient_count: recipients?.length ?? 0,
      sent_at: bulletin.sent_at,
      created_at: bulletin.created_at,
      recipients: recipients ?? [],
    },
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createAdminClient()

  // Verify it's still a draft
  const { data: existing, error: fetchError } = await supabase
    .from('bulletins')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError) {
    const status = fetchError.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ error: fetchError.message }, { status })
  }

  if (existing.status !== 'draft') {
    return NextResponse.json(
      { error: 'Solo se pueden editar boletines en borrador' },
      { status: 409 }
    )
  }

  const body = await request.json()
  const { subject, body: bulletinBody, target_group, target_plan_id } = body

  const { error } = await supabase
    .from('bulletins')
    .update({
      ...(subject !== undefined && { subject }),
      ...(bulletinBody !== undefined && { body: bulletinBody }),
      ...(target_group !== undefined && { target_group }),
      ...(target_plan_id !== undefined && { target_plan_id }),
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createAdminClient()

  const { data: existing, error: fetchError } = await supabase
    .from('bulletins')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError) {
    const status = fetchError.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ error: fetchError.message }, { status })
  }

  if (existing.status !== 'draft') {
    return NextResponse.json(
      { error: 'Solo se pueden eliminar boletines en borrador' },
      { status: 409 }
    )
  }

  const { error } = await supabase.from('bulletins').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
