'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, AlertTriangle, AlertCircle, Calendar, FileBarChart, FileText, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationItem, NotificationType } from '@/types/notifications'

const ICON_BY_TYPE: Record<NotificationType, typeof AlertCircle> = {
  approval: FileText,
  revision_request: AlertCircle,
  new_application: FileText,
  report_due: FileBarChart,
  contract_expiring: AlertTriangle,
  disbursement_due: Calendar,
  process_delayed: Clock,
}

const COLOR_BY_TYPE: Record<NotificationType, string> = {
  approval: 'text-green-600 bg-green-50',
  revision_request: 'text-orange-600 bg-orange-50',
  new_application: 'text-blue-600 bg-blue-50',
  report_due: 'text-purple-600 bg-purple-50',
  contract_expiring: 'text-yellow-700 bg-yellow-50',
  disbursement_due: 'text-blue-600 bg-blue-50',
  process_delayed: 'text-red-600 bg-red-50',
}

const LINK_BY_TYPE: (n: NotificationItem) => string = (n) => {
  if (n.contract_id) return `/dashboard/contracts/${n.contract_id}`
  if (n.type === 'new_application') return '/dashboard/contracts?source=external_form'
  return '/dashboard/notifications'
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'recién'
  if (minutes < 60) return `hace ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days}d`
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'short' }).format(new Date(iso))
}

export function NotificationsBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  async function fetchAll() {
    try {
      const res = await fetch('/api/notifications?unread_only=true', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      const list: NotificationItem[] = data.notifications ?? []
      setItems(list)
      setUnreadCount(list.length)
    } catch {
      // silent
    }
  }

  // Initial load + poll every 60s (fetch de datos al montar — patrón estándar)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll()
    const interval = setInterval(fetchAll, 60000)
    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function toggle() {
    if (!open) {
      // Trigger scan to detect new time-based events
      setLoading(true)
      try {
        await fetch('/api/notifications/scan', { method: 'POST' })
      } catch {
        // silent
      }
      await fetchAll()
      setLoading(false)
    }
    setOpen(!open)
  }

  async function handleNotificationClick(notif: NotificationItem) {
    // Mark as read
    try {
      await fetch(`/api/notifications/${notif.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      })
    } catch {
      // silent
    }
    setOpen(false)
    router.push(LINK_BY_TYPE(notif))
    // Refresh count
    setItems((prev) => prev.filter((n) => n.id !== notif.id))
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  async function handleMarkAllRead() {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      })
    } catch {
      // silent
    }
    setItems([])
    setUnreadCount(0)
  }

  const top5 = items.slice(0, 5)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
      >
        <Bell size={18} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-900 px-1 text-[10px] font-semibold text-white leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-zinc-200 bg-white shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-900">
              Notificaciones
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-normal text-zinc-500">
                  {unreadCount} sin leer
                </span>
              )}
            </h3>
            {items.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[28rem] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-400">Cargando...</div>
            ) : top5.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell size={20} className="mx-auto text-zinc-300 mb-2" />
                <p className="text-sm text-zinc-500">No hay notificaciones pendientes</p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {top5.map((notif) => {
                  const Icon = ICON_BY_TYPE[notif.type] ?? Bell
                  const colorClass = COLOR_BY_TYPE[notif.type] ?? 'text-zinc-600 bg-zinc-50'
                  return (
                    <li key={notif.id}>
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(notif)}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
                      >
                        <div className={cn('shrink-0 rounded-md p-1.5', colorClass)}>
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-900">{notif.title}</p>
                          {notif.body && (
                            <p className="text-xs text-zinc-600 mt-0.5 line-clamp-2">{notif.body}</p>
                          )}
                          <p className="text-xs text-zinc-400 mt-1">{timeAgo(notif.created_at)}</p>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="px-4 py-2.5 border-t border-zinc-100 bg-zinc-50">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  router.push('/dashboard/notifications')
                }}
                className="w-full text-center text-xs font-medium text-zinc-700 hover:text-zinc-900 transition-colors"
              >
                Ver todas {items.length > 5 ? `(${items.length})` : ''}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
