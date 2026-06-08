'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2, Upload, X } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface CommissionPayButtonProps {
  commissionId: string
  amount: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function CommissionPayButton({ commissionId, amount }: CommissionPayButtonProps) {
  const router = useRouter()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [optimisticPaid, setOptimisticPaid] = useState(false)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setReceiptFile(null)
      setError(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, loading])

  if (optimisticPaid) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
        <CheckCircle size={13} />
        Pagada
      </span>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('action', 'pay')
      if (receiptFile) formData.append('receipt', receiptFile)

      const res = await fetch(`/api/referrals/${commissionId}`, {
        method: 'PATCH',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al marcar la comisión como pagada')
        return
      }

      setOptimisticPaid(true)
      setOpen(false)
      toast.success(`Comisión de ${formatCurrency(amount)} marcada como pagada`)
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
        onClick={() => setOpen(true)}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-700 bg-zinc-100 border border-zinc-200 rounded-md hover:bg-zinc-200 hover:border-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CheckCircle size={12} />
        Marcar pagada
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="commission-pay-title"
        >
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => !loading && setOpen(false)}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-xl border border-zinc-200 shadow-xl">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-100">
              <h2 id="commission-pay-title" className="text-sm font-semibold text-zinc-900">
                Marcar comisión como pagada
              </h2>
              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                disabled={loading}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-50"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-5 space-y-4">
              <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-3">
                <p className="text-xs text-zinc-500">Monto a pagar</p>
                <p className="text-lg font-semibold text-zinc-900 font-mono">
                  {formatCurrency(amount)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Comprobante (opcional)
                </label>
                <label className="flex items-center gap-2 w-full rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-500 cursor-pointer hover:border-zinc-400 hover:bg-zinc-100 transition-colors">
                  <Upload size={14} className="shrink-0 text-zinc-400" />
                  <span className="truncate">
                    {receiptFile ? receiptFile.name : 'Seleccionar archivo (PDF / imagen)'}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    className="sr-only"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <p className="mt-1.5 text-xs text-zinc-400">
                  Adjuntá el respaldo del pago (transferencia, SINPE, etc.) para tener evidencia.
                </p>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {loading ? 'Procesando...' : 'Marcar pagada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
