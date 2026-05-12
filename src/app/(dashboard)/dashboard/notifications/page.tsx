import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { NotificationItem } from '@/types/notifications'
import { NotificationsList } from './_components/notifications-list'

export const metadata = {
  title: 'Notificaciones | Grandir CM',
}

export default async function NotificationsPage() {
  const authClient = await createClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = await createAdminClient()

  // Trigger a scan on page load so the user sees fresh time-based notifications
  try {
    const { headers } = await import('next/headers')
    const h = await headers()
    const host = h.get('host')
    const protocol = h.get('x-forwarded-proto') ?? 'http'
    await fetch(`${protocol}://${host}/api/notifications/scan`, {
      method: 'POST',
      cache: 'no-store',
    }).catch(() => {})
  } catch {
    // silent
  }

  const { data } = await supabase
    .from('notifications')
    .select('id, type, title, body, contract_id, investor_id, read, read_at, created_at')
    .eq('recipient_user_id', user.id)
    .order('created_at', { ascending: false })

  const notifications = (data ?? []) as NotificationItem[]

  return (
    <div className="max-w-3xl mx-auto">
      <NotificationsList initial={notifications} />
    </div>
  )
}
