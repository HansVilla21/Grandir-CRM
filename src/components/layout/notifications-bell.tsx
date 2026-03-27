'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function NotificationsBell() {
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch('/api/notifications?unread_only=true', {
          cache: 'no-store',
        })
        if (!res.ok) return
        const data = await res.json()
        setUnreadCount(data.notifications?.length ?? 0)
      } catch {
        // Silently fail — bell is non-critical
      }
    }

    fetchUnread()
  }, [])

  function handleClick() {
    router.push('/dashboard/notifications')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
      className="relative flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
    >
      {/* Bell SVG */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>

      {/* Badge */}
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-900 px-1 text-[10px] font-semibold text-white leading-none">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}
