'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PenLine, X, Loader2, AlertTriangle } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface AdminSignatureBannerProps {
  contractId: string
  contractShortId: string
  holderName: string
  holderSignedAt: string | null
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    const date = new Date(iso)
    if (isNaN(date.getTime())) return iso

    // Construimos el string manualmente con formatToParts para evitar el
    // hydration mismatch que ocurría con Intl.DateTimeFormat({dateStyle, timeStyle}):
    // Node (en server) y el browser usan versiones distintas de CLDR y a veces
    // intercalan "a las" o "," entre fecha y hora. Al armar el string a mano
    // controlamos el separator y es 100 % consistente.
    const parts = new Intl.DateTimeFormat('es-CR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Costa_Rica',
    }).formatToParts(date)

    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? ''

    return `${get('day')} de ${get('month')} de ${get('year')}, ${get('hour')}:${get('minute')}`
  } catch {
    return iso
  }
}

export function AdminSignatureBanner({
  contractId,
  contractShortId,
  holderName,
  holderSignedAt,
}: AdminSignatureBannerProps) {
  const router = useRouter()
  const toast = useToast()
  const [confirmSignOpen, setConfirmSignOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [signing, setSigning] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const rejectInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (rejectOpen) setTimeout(() => rejectInputRef.current?.focus(), 50)
  }, [rejectOpen])

  async function handleSign() {
    setSigning(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}/admin-sign`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'No se pudo firmar el contrato')
        return
      }
      toast.success('Contrato firmado y activado. El inversionista fue notificado.')
      setConfirmSignOpen(false)
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSigning(false)
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault()
    const reason = rejectReason.trim()
    if (!reason) {
      toast.error('Indica el motivo del rechazo')
      return
    }
    setRejecting(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}/reject-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'No se pudo rechazar el contrato')
        return
      }
      toast.success('Contrato devuelto a borrador. Podés corregir y reenviar.')
      setRejectOpen(false)
      setRejectReason('')
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setRejecting(false)
    }
  }

  return (
    <>
      <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex gap-3 flex-1 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700">
              <PenLine size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-purple-900">
                {holderName} firmó. Falta tu firma para activar el contrato.
              </h3>
              <p className="mt-1 text-xs text-purple-700/80 leading-relaxed">
                Firmado por el inversionista el {formatDateTime(holderSignedAt)}.
                Al firmar, el contrato pasa a <strong>Activo</strong> y se envía
                un email al inversionista con el PDF firmado por ambas partes.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setRejectOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              <AlertTriangle size={12} />
              Solicitar corrección
            </button>
            <button
              type="button"
              onClick={() => setConfirmSignOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <PenLine size={12} />
              Firmar como Grandir
            </button>
          </div>
        </div>
      </div>

      {/* Confirm sign */}
      <ConfirmDialog
        open={confirmSignOpen}
        title="Firmar contrato como Grandir CM"
        description={`Al confirmar, estás firmando el contrato #${contractShortId} en representación de Grandir CM S.R.L. Tu nombre, fecha, hora e IP quedan registrados en el certificado de firma. El contrato pasa a "Activo" y se envía un email al inversionista.`}
        confirmLabel="Sí, firmar"
        variant="success"
        loading={signing}
        onConfirm={handleSign}
        onCancel={() => setConfirmSignOpen(false)}
      />

      {/* Reject modal */}
      {rejectOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => !rejecting && setRejectOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-xl border border-zinc-200 shadow-xl">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-900">
                Solicitar corrección
              </h2>
              <button
                type="button"
                onClick={() => !rejecting && setRejectOpen(false)}
                disabled={rejecting}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-50"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleReject} className="px-4 sm:px-6 py-5 space-y-4">
              <p className="text-xs text-zinc-500 leading-relaxed">
                El contrato volverá a borrador. La firma del inversionista se
                limpia y se le muestra tu motivo cuando vuelva a firmar.
              </p>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Motivo <span className="text-red-500">*</span>
                </label>
                <textarea
                  ref={rejectInputRef}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                  maxLength={500}
                  rows={4}
                  placeholder="Ej: El monto no coincide con lo acordado. Hay que actualizarlo a $X y reenviar."
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-none"
                />
                <p className="mt-1 text-[10px] text-zinc-400">
                  {rejectReason.length} / 500 caracteres
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectOpen(false)}
                  disabled={rejecting}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={rejecting || !rejectReason.trim()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {rejecting && <Loader2 size={14} className="animate-spin" />}
                  {rejecting ? 'Rechazando...' : 'Solicitar corrección'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
