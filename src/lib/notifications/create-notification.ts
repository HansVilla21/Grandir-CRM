import { createServiceClient } from '@/lib/supabase/server'
import type { NotificationType, NotificationChannel } from '@/types/notifications'

export async function createNotification(params: {
  recipient_user_id: string
  type: NotificationType
  channel: NotificationChannel
  title: string
  body?: string
  contract_id?: string
  investor_id?: string
}) {
  const supabase = createServiceClient()
  return supabase.from('notifications').insert({
    recipient_user_id: params.recipient_user_id,
    type: params.type,
    channel: params.channel,
    title: params.title,
    body: params.body ?? null,
    contract_id: params.contract_id ?? null,
    investor_id: params.investor_id ?? null,
  })
}
