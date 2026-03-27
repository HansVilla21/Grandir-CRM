'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function NotificationsMarkAllButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleMarkAll() {
    setLoading(true)
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleMarkAll}
      disabled={loading}
      className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors disabled:opacity-50"
    >
      {loading ? 'Marcando...' : 'Marcar todas como leídas'}
    </button>
  )
}
