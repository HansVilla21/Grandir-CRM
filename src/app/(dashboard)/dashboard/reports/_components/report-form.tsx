'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2, Info } from 'lucide-react'
import type { ContractForReportForm } from '@/types/reports'

interface ReportFormProps {
  contracts: ContractForReportForm[]
  onSuccess: () => void
  defaultContractId?: string
}

function firstDayOfCurrentMonthISO() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function ReportForm({ contracts, onSuccess, defaultContractId }: ReportFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const [form, setForm] = useState({
    contract_id: defaultContractId ?? '',
    period_start: firstDayOfCurrentMonthISO(),
    period_end: todayISO(),
    growth_rate: '',
    description: '',
  })

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setForm({
        contract_id: defaultContractId ?? '',
        period_start: firstDayOfCurrentMonthISO(),
        period_end: todayISO(),
        growth_rate: '',
        description: '',
      })
      setError(null)
    }
  }, [open, defaultContractId])

  // Auto-calcular monto basado en capital del contrato × tasa
  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === form.contract_id) ?? null,
    [contracts, form.contract_id]
  )
  const growthRateNum = Number(form.growth_rate) || 0
  const autoCalculatedAmount =
    selectedContract && growthRateNum > 0
      ? (selectedContract.amount * growthRateNum) / 100
      : null

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
          calculated_amount: autoCalculatedAmount,
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
                <label htmlFor="report-contract" className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Contrato <span className="text-red-500">*</span>
                </label>
                <select
                  id="report-contract"
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
                  <label htmlFor="report-period-start" className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Período inicio <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="report-period-start"
                    type="date"
                    value={form.period_start}
                    onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="report-period-end" className="block text-sm font-medium text-zinc-700 mb-1.5">
                    Período fin <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="report-period-end"
                    type="date"
                    value={form.period_end}
                    onChange={(e) => setForm((f) => ({ ...f, period_end: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Tasa de crecimiento */}
              <div>
                <label htmlFor="report-growth" className="block text-sm font-medium text-zinc-700 mb-1.5">
                  ¿Cuánto creció el fondo en este período? (%) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="report-growth"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ej: 10"
                    value={form.growth_rate}
                    onChange={(e) => setForm((f) => ({ ...f, growth_rate: e.target.value }))}
                    className="w-full pl-3 pr-8 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">%</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500 flex items-start gap-1">
                  <Info size={12} className="mt-0.5 shrink-0" />
                  <span>Es el porcentaje que creció el fondo Grandir CM durante el período. El sistema calculará automáticamente cuánto rendimiento le corresponde al inversionista según su capital.</span>
                </p>
              </div>

              {/* Auto-calculated preview */}
              {selectedContract && autoCalculatedAmount !== null && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                  <p className="text-xs text-green-700">Rendimiento que se le comunicará al inversionista</p>
                  <p className="text-lg font-semibold text-green-900 mt-0.5">
                    +{formatCurrency(autoCalculatedAmount)}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Capital invertido: {formatCurrency(selectedContract.amount)} × {growthRateNum}%
                  </p>
                </div>
              )}

              {/* Descripción */}
              <div>
                <label htmlFor="report-description" className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Descripción del período <span className="text-zinc-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  id="report-description"
                  rows={3}
                  placeholder="Ej: En estos meses se trabajó sobre el movimiento del oro y noticias importantes que permitieron ganar rentabilidad."
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
