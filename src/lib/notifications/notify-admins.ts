import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { NotificationType, NotificationChannel } from '@/types/notifications'

interface NotifyAdminsParams {
  supabase: SupabaseClient<Database>
  type: NotificationType
  channel?: NotificationChannel
  title: string
  body?: string
  contract_id?: string
  investor_id?: string
}

/**
 * Creates a notification for every admin user. Non-blocking — logs errors but does not throw.
 * Pass the supabase client from the caller (works with both createAdminClient and createServiceClient).
 */
export async function notifyAdmins(params: NotifyAdminsParams): Promise<void> {
  try {
    const { data: admins } = await params.supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'admin')

    if (!admins || admins.length === 0) return

    const rows = admins.map((admin) => ({
      recipient_user_id: admin.id,
      type: params.type,
      channel: params.channel ?? ('internal' as NotificationChannel),
      title: params.title,
      body: params.body ?? null,
      contract_id: params.contract_id ?? null,
      investor_id: params.investor_id ?? null,
    }))

    const { error } = await params.supabase.from('notifications').insert(rows)
    if (error) console.error('[notify-admins] insert error:', error)
  } catch (err) {
    console.error('[notify-admins] error:', err)
  }
}
