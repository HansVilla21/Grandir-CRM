'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import type { ContractForReportForm } from '@/types/reports'

interface ReportFormProps {
  contracts: ContractForReportForm[]
  onSuccess: () => void
  defaultContractId?: string
}

export function ReportForm({ contracts, onSuccess, defaultContractId }: ReportFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const [form, setForm] = useState({
    contract_id: defaultContractId ?? '',
    period_start: '',
    period_end: '',
    growth_rate: '',
    calculated_amount: '',
    description: '',
  })

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setForm({
        contract_id: defaultContractId ?? '',
        period_start: '',
        period_end: '',
        growth_rate: '',
        calculated_amount: '',
        description: '',
      })
      setError(null)
    }
  }, [open, defaultContractId])

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) setOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.contract_id) {
      setError('Debes seleccionar un contrato.')
      return
    }
    if (!form.period_start || !form.period_end) {
      setError('Debes ingresar el período.')
      return
    }
    if (!form.growth_rate) {
      setError('Debes ingresar la tasa de crecimiento.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_id: form.contract_id,
          period_start: form.period_start,
          period_end: form.period_end,
          growth_rate: parseFloat(form.growth_rate),
          calculated_amount: form.calculated_amount
            ? parseFloat(form.calculated_amount)
            : null,
          description: form.description || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al crear el reporte')
        return
      }

      setOpen(false)
      onSuccess()
      router.refresh()
    } catch {
      setError('Error de red. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
      >
        Nuevo reporte
      </button>

      {open && (
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          aria-modal="true"
          role="dialog"
          aria-label="Crear reporte"
        >
          <div className="bg-white rounded-xl border border-zinc-200 shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-zinc-100">
              <h2 className="text-base font-semibold text-zinc-900">Nuevo reporte</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-5 sm:py-6 space-y-5">
              {/* Contrato */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Contrato <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.contract_id}
                  onChange={(e) => setForm((f) => ({ ...f, contract_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                >
                  <option value="">Seleccionar contrato...</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.holder_name} — {c.plan_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Período */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Período inicio <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.period_start}
                    onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Período fin <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.period_end}
                    onChange={(e) => setForm((f) => ({ ...f, period_end: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Tasa + Monto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Tasa de crecimiento (%) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ej: 10.50"
                    value={form.growth_rate}
                    onChange={(e) => setForm((f) => ({ ...f, growth_rate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Monto calculado ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Opcional"
                    value={form.calculated_amount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, calculated_amount: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  placeholder="Observaciones del período (opcional)"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  Crear reporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
