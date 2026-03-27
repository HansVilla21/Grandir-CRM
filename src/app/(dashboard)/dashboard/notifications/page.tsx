import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { NotificationItem, NotificationType } from '@/types/notifications'
import { NotificationsMarkAllButton } from './_components/notifications-mark-all-button'

export const metadata = {
  title: 'Notificaciones | Grandir CM',
}

const TYPE_ICONS: Record<NotificationType, { icon: string; color: string }> = {
  approval: { icon: '✓', color: 'text-emerald-600 bg-emerald-50' },
  revision_request: { icon: '!', color: 'text-orange-600 bg-orange-50' },
  new_application: { icon: '⊞', color: 'text-blue-600 bg-blue-50' },
  report_due: { icon: '◷', color: 'text-yellow-600 bg-yellow-50' },
  contract_expiring: { icon: '⊡', color: 'text-red-600 bg-red-50' },
  disbursement_due: { icon: '$', color: 'text-emerald-600 bg-emerald-50' },
  process_delayed: { icon: '△', color: 'text-red-600 bg-red-50' },
}

const TYPE_LABELS: Record<NotificationType, string> = {
  approval: 'Aprobación',
  revision_request: 'Revisión solicitada',
  new_application: 'Nueva solicitud',
  report_due: 'Reporte pendiente',
  contract_expiring: 'Contrato por vencer',
  disbursement_due: 'Desembolso pendiente',
  process_delayed: 'Proceso atrasado',
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Ahora mismo'
  if (minutes < 60) return `Hace ${minutes} min`
  if (hours < 24) return `Hace ${hours} h`
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

function groupByDate(notifications: NotificationItem[]) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfWeek = startOfToday - (now.getDay() || 7) * 86400000

  const today: NotificationItem[] = []
  const thisWeek: NotificationItem[] = []
  const older: NotificationItem[] = []

  for (const n of notifications) {
    const ts = new Date(n.created_at).getTime()
    if (ts >= startOfToday) today.push(n)
    else if (ts >= startOfWeek) thisWeek.push(n)
    else older.push(n)
  }

  return [
    { label: 'Hoy', items: today },
    { label: 'Esta semana', items: thisWeek },
    { label: 'Anteriores', items: older },
  ].filter((g) => g.items.length > 0)
}

function NotificationRow({ n }: { n: NotificationItem }) {
  const icon = TYPE_ICONS[n.type as NotificationType] ?? {
    icon: '•',
    color: 'text-zinc-500 bg-zinc-100',
  }

  const href = n.contract_id
    ? `/dashboard/contracts/${n.contract_id}`
    : n.investor_id
    ? `/dashboard/investors/${n.investor_id}`
    : null

  const Inner = (
    <div
      className={[
        'flex items-start gap-3 px-3 sm:px-4 py-3 rounded-lg transition-colors',
        !n.read ? 'bg-zinc-50' : 'bg-white',
        href ? 'hover:bg-zinc-100/60' : '',
      ].join(' ')}
    >
      {/* Icon */}
      <div
        className={[
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          icon.color,
        ].join(' ')}
      >
        {icon.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={['text-sm', !n.read ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-700'].join(' ')}>
            {n.title}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {!n.read && (
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-zinc-900" />
            )}
            <span className="text-xs text-zinc-400">
              {formatRelativeTime(n.created_at)}
            </span>
          </div>
        </div>
        {n.body && (
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{n.body}</p>
        )}
        <p className="text-xs text-zinc-400 mt-0.5">
          {TYPE_LABELS[n.type as NotificationType] ?? n.type}
        </p>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {Inner}
      </Link>
    )
  }

  return Inner
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

  const { data } = await supabase
    .from('notifications')
    .select('id, type, title, body, contract_id, investor_id, read, read_at, created_at')
    .eq('recipient_user_id', user.id)
    .order('created_at', { ascending: false })

  const notifications = (data ?? []) as NotificationItem[]
  const unreadCount = notifications.filter((n) => !n.read).length
  const groups = groupByDate(notifications)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold text-zinc-900">Notificaciones</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {unreadCount > 0
              ? `${unreadCount} sin leer`
              : 'Todas leídas'}
          </p>
        </div>
        {unreadCount > 0 && <NotificationsMarkAllButton />}
      </div>

      {/* Grouped list */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-12 text-center">
          <p className="text-sm text-zinc-400">No tienes notificaciones.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2 px-1">
                {group.label}
              </p>
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm divide-y divide-zinc-100 overflow-hidden">
                {group.items.map((n) => (
                  <NotificationRow key={n.id} n={n} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
