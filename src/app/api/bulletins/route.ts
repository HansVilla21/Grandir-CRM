import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireInternalUser } from '@/lib/auth/guard'

export async function GET() {
  const { response } = await requireInternalUser()
  if (response) return response

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('bulletins')
    .select(`
      id,
      subject,
      status,
      target_group,
      target_plan_id,
      sent_at,
      created_at,
      investment_plans:target_plan_id ( name ),
      bulletin_recipients ( id )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  type RawBulletin = NonNullable<typeof data>[number]

  const bulletins = (data ?? []).map((b: RawBulletin) => {
    const plan = b.investment_plans as { name: string } | null
    const recipients = b.bulletin_recipients as { id: string }[] | null
    return {
      id: b.id,
      subject: b.subject,
      status: b.status,
      target_group: b.target_group,
      target_plan_name: plan?.name ?? null,
      recipient_count: recipients?.length ?? 0,
      sent_at: b.sent_at,
      created_at: b.created_at,
    }
  })

  return NextResponse.json({ bulletins })
}

export async function POST(request: NextRequest) {
  const { profile, response } = await requireInternalUser()
  if (response) return response

  const body = await request.json()
  const { subject, body: bulletinBody, target_group, target_plan_id } = body

  if (!subject || !bulletinBody || !target_group) {
    return NextResponse.json(
      { error: 'Faltan campos requeridos: subject, body, target_group' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('bulletins')
    .insert({
      subject,
      body: bulletinBody,
      target_group,
      target_plan_id: target_plan_id ?? null,
      sent_by: profile.id,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}
