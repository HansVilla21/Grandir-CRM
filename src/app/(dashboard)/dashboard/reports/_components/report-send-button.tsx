'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2, CheckCircle } from 'lucide-react'
import type { ReportStatus } from '@/types/reports'

interface ReportSendButtonProps {
  reportId: string
  status: ReportStatus
  recipientEmails: string[]
}

export function ReportSendButton({ reportId, status, recipientEmails }: ReportSendButtonProps) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const canSend = (status === 'pending' || status === 'generated') && !sent

  async function handleSend() {
    if (recipientEmails.length === 0) {
      setError('No hay emails registrados para enviar.')
      return
    }

    const confirmed = window.confirm(
      `Se enviará el reporte a:\n${recipientEmails.join(', ')}\n\n¿Continuar?`
    )
    if (!confirmed) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/reports/${reportId}/send`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al enviar el reporte')
        return
      }

      setSent(true)
      router.refresh()
    } catch {
      setError('Error de red. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (sent || status === 'sent') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-200">
        <CheckCircle size={16} />
        Enviado correctamente
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {recipientEmails.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-1.5">Destinatarios:</p>
          <div className="flex flex-wrap gap-1.5">
            {recipientEmails.map((email) => (
              <span
                key={email}
                className="inline-flex items-center px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded text-xs font-mono"
              >
                {email}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        onClick={handleSend}
        disabled={!canSend || loading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 disabled:opacity-40 transition-colors"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Send size={14} />
        )}
        Enviar reporte
      </button>

      {recipientEmails.length === 0 && (
        <p className="text-xs text-zinc-400">
          Este contrato no tiene emails de inversionistas registrados.
        </p>
      )}
    </div>
  )
}
