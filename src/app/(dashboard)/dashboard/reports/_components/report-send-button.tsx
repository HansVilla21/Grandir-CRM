'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2, CheckCircle } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import type { ReportStatus } from '@/types/reports'

interface ReportSendButtonProps {
  reportId: string
  status: ReportStatus
  recipientEmails: string[]
}

export function ReportSendButton({ reportId, status, recipientEmails }: ReportSendButtonProps) {
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const canSend = (status === 'pending' || status === 'generated') && !sent

  function handleSendClick() {
    if (recipientEmails.length === 0) {
      setError('No hay emails registrados para enviar.')
      return
    }
    setError(null)
    setConfirmOpen(true)
  }

  async function handleConfirm() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/reports/${reportId}/send`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Error al enviar el reporte')
        return
      }

      setConfirmOpen(false)
      setSent(true)
      toast.success('Reporte enviado correctamente')
      router.refresh()
    } catch {
      toast.error('Error de red. Intenta de nuevo.')
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
        onClick={handleSendClick}
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

      <ConfirmDialog
        open={confirmOpen}
        title="Enviar reporte"
        description={`Se enviará el reporte a:\n${recipientEmails.join(', ')}`}
        confirmLabel="Enviar"
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
