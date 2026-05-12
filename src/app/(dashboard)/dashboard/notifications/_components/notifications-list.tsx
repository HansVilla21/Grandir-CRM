'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell,
  AlertCircle,
  AlertTriangle,
  Calendar,
  FileBarChart,
  FileText,
  Clock,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationItem, NotificationType } from '@/types/notifications'

interface NotificationsListProps {
  initial: NotificationItem[]
}

const TYPE_ICONS: Record<NotificationType, typeof AlertCircle> = {
  approval: FileText,
  revision_request: AlertCircle,
  new_application: FileText,
  report_due: FileBarChart,
  contract_expiring: AlertTriangle,
  disbursement_due: Calendar,
  process_delayed: Clock,
}

const TYPE_COLORS: Record<NotificationType, string> = {
  approval: 'text-green-600 bg-green-50',
  revision_request: 'text-orange-600 bg-orange-50',
  new_application: 'text-blue-600 bg-blue-50',
  report_due: 'text-purple-600 bg-purple-50',
  contract_expiring: 'text-yellow-700 bg-yellow-50',
  disbursement_due: 'text-blue-600 bg-blue-50',
  process_delayed: 'text-red-600 bg-red-50',
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

type ReadFilter = 'all' | 'unread' | 'read'
type TypeFilter = 'all' | NotificationType

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

function buildHref(n: NotificationItem): string | null {
  if (n.contract_id) return `/dashboard/contracts/${n.contract_id}`
  if (n.investor_id) return `/dashboard/investors/${n.investor_id}`
  return null
}

export function NotificationsList({ initial }: NotificationsListProps) {
  const router = useRouter()
  const [items, setItems] = useState<NotificationItem[]>(initial)
  const [readFilter, setReadFilter] = useState<ReadFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (readFilter === 'unread' && n.read) return false
      if (readFilter === 'read' && !n.read) return false
      if (typeFilter !== 'all' && n.type !== typeFilter) return false
      return true
    })
  }, [items, readFilter, typeFilter])

  async function markAsRead(notif: NotificationItem) {
    if (notif.read) return
    setItems((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true, read_at: new Date().toISOString() } : n))
    )
    try {
      await fetch(`/api/notifications/${notif.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      })
    } catch {
      // revert on error
      setItems((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: false, read_at: null } : n))
      )
    }
  }

  async function handleNotificationClick(notif: NotificationItem) {
    await markAsRead(notif)
    const href = buildHref(notif)
    if (href) router.push(href)
  }

  async function markAllAsRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() })))
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      })
    } catch {
      // silent
    }
  }

  const unreadCount = items.filter((n) => !n.read).length
  const groups = groupByDate(filtered)

  // Active type filters for the chip strip
  const typeChips: Array<{ value: TypeFilter; label: string; count: number }> = [
    { value: 'all', label: 'Todos', count: items.length },
    ...Object.entries(TYPE_LABELS).map(([type, label]) => ({
      value: type as TypeFilter,
      label,
      count: items.filter((n) => n.type === type).length,
    })).filter((chip) => chip.count > 0),
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold text-zinc-900">Notificaciones</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <Check size={14} />
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Read/unread tabs */}
        <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-lg p-0.5 w-fit">
          <FilterTab current={readFilter} value="all" label="Todas" onClick={setReadFilter} />
          <FilterTab current={readFilter} value="unread" label={`Sin leer${unreadCount > 0 ? ` (${unreadCount})` : ''}`} onClick={setReadFilter} />
          <FilterTab current={readFilter} value="read" label="Leídas" onClick={setReadFilter} />
        </div>

        {/* Type chips (scrollable) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {typeChips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => setTypeFilter(chip.value)}
              className={cn(
                'shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                typeFilter === chip.value
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
              )}
            >
              {chip.label}
              <span className={cn('text-[10px]', typeFilter === chip.value ? 'text-zinc-300' : 'text-zinc-400')}>
                {chip.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grouped list */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-12 text-center">
          <Bell size={24} className="mx-auto text-zinc-300 mb-3" />
          <p className="text-sm text-zinc-400">
            {items.length === 0
              ? 'No tienes notificaciones todavía.'
              : 'Ninguna notificación coincide con los filtros.'}
          </p>
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
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    onClick={() => handleNotificationClick(n)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterTab({
  current,
  value,
  label,
  onClick,
}: {
  current: ReadFilter
  value: ReadFilter
  label: string
  onClick: (v: ReadFilter) => void
}) {
  const isActive = current === value
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={cn(
        'rounded px-3 py-1 text-xs font-medium transition-colors',
        isActive ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
      )}
    >
      {label}
    </button>
  )
}

function NotificationRow({
  notification: n,
  onClick,
}: {
  notification: NotificationItem
  onClick: () => void
}) {
  const Icon = TYPE_ICONS[n.type as NotificationType] ?? Bell
  const colorClass = TYPE_COLORS[n.type as NotificationType] ?? 'text-zinc-500 bg-zinc-100'
  const href = buildHref(n)

  const inner = (
    <div
      className={cn(
        'flex items-start gap-3 px-3 sm:px-4 py-3 transition-colors',
        !n.read ? 'bg-zinc-50' : 'bg-white',
        href ? 'hover:bg-zinc-100/60 cursor-pointer' : ''
      )}
    >
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', colorClass)}>
        <Icon size={14} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm', !n.read ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-700')}>
            {n.title}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {!n.read && <span className="inline-flex h-1.5 w-1.5 rounded-full bg-zinc-900" />}
            <span className="text-xs text-zinc-400">{formatRelativeTime(n.created_at)}</span>
          </div>
        </div>
        {n.body && <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{n.body}</p>}
        <p className="text-xs text-zinc-400 mt-0.5">
          {TYPE_LABELS[n.type as NotificationType] ?? n.type}
        </p>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} onClick={onClick} className="block">
        {inner}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      {inner}
    </button>
  )
}
