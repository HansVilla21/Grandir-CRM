'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { InvestorStatus } from '@/types/investors'

interface InvestorStatusToggleProps {
  investorId: string
  currentStatus: InvestorStatus
  investorName: string
}

export function InvestorStatusToggle({
  investorId,
  currentStatus,
  investorName,
}: InvestorStatusToggleProps) {
  const router = useRouter()
  const [status, setStatus] = useState<InvestorStatus>(currentStatus)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nextStatus: InvestorStatus = status === 'active' ? 'inactive' : 'active'
  const actionLabel = status === 'active' ? 'desactivar' : 'activar'

  async function handleConfirm() {
    setLoading(true)
    setError(null)

    // Optimistic update
    setStatus(nextStatus)
    setShowConfirm(false)

    try {
      const res = await fetch(`/api/investors/${investorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })

      const json = await res.json()

      if (!res.ok) {
        // Revert on failure
        setStatus(currentStatus)
        setError(json.error ?? 'Error al actualizar estado')
        return
      }

      router.refresh()
    } catch {
      setStatus(currentStatus)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}

      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
      >
        {status === 'active' ? 'Desactivar' : 'Activar'}
      </button>

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowConfirm(false)}
            aria-hidden="true"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            className="relative z-10 bg-white rounded-xl shadow-xl border border-zinc-200 w-full max-w-sm mx-4 p-6"
          >
            <h3 className="text-base font-semibold text-zinc-900 mb-2">
              Confirmar cambio de estado
            </h3>
            <p className="text-sm text-zinc-500 mb-6">
              ¿Estás seguro de que deseas{' '}
              <span className="font-medium text-zinc-700">{actionLabel}</span> al
              inversionista <span className="font-medium text-zinc-700">{investorName}</span>?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
