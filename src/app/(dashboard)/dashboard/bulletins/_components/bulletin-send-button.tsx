'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BulletinSendButtonProps {
  bulletinId: string
  estimatedCount: number
  targetGroupLabel: string
}

export function BulletinSendButton({
  bulletinId,
  estimatedCount,
  targetGroupLabel,
}: BulletinSendButtonProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    setError(null)
    setSending(true)

    try {
      const res = await fetch(`/api/bulletins/${bulletinId}/send`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al enviar')
      }

      setSent(true)
      setConfirming(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        Boletín enviado correctamente.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          Enviar boletín
        </button>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-zinc-900">
              Confirmar envío
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              Se enviará a{' '}
              <span className="font-semibold text-zinc-900">
                ~{estimatedCount}
              </span>{' '}
              inversionista{estimatedCount !== 1 ? 's' : ''} ({targetGroupLabel}
              ). Esta acción no se puede deshacer.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={sending}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-white transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Enviando...' : 'Confirmar envío'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
