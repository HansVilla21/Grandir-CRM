import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireInternalUser } from '@/lib/auth/guard'

export async function GET(request: NextRequest) {
  const { profile, response } = await requireInternalUser()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unread_only') === 'true'

  const supabase = createServiceClient()

  let query = supabase
    .from('notifications')
    .select('id, type, title, body, contract_id, investor_id, read, read_at, created_at')
    .eq('recipient_user_id', profile.id)
    .order('created_at', { ascending: false })

  if (unreadOnly) {
    query = query.eq('read', false)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ notifications: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { profile, response } = await requireInternalUser()
  if (response) return response

  const body = await request.json()

  if (body.action !== 'mark_all_read') {
    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq('recipient_user_id', profile.id)
    .eq('read', false)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
