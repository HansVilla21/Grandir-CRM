import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireInternalUser } from '@/lib/auth/guard'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { profile, response } = await requireInternalUser()
  if (response) return response

  const body = await request.json()

  if (body.action !== 'mark_read') {
    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('recipient_user_id', profile.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
