'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

interface InvestorDeleteButtonProps {
  investorId: string
  investorName: string
}

export function InvestorDeleteButton({ investorId, investorName }: InvestorDeleteButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/investors/${investorId}`, { method: 'DELETE' })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Error al eliminar')
        return
      }

      router.push('/dashboard/investors')
      router.refresh()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setError('') }}
        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
      >
        <Trash2 size={13} />
        Eliminar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !loading && setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 bg-white rounded-xl shadow-xl border border-zinc-200 w-full max-w-sm mx-4 p-4 sm:p-6">
            <h3 className="text-base font-semibold text-zinc-900 mb-2">Eliminar inversionista</h3>
            <p className="text-sm text-zinc-600 mb-1">
              ¿Estás seguro de que querés eliminar a <strong>{investorName}</strong>?
            </p>
            <p className="text-xs text-zinc-400 mb-4">Esta acción no se puede deshacer.</p>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 mb-4">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
