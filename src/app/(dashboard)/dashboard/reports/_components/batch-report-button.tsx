'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileBarChart, Loader2, X, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

interface DueContract {
  contract_id: string
  holder_name: string | null
  plan_name: string
  contract_start_date: string | null
  report_frequency_months: number
  last_report_period_end: string | null
  next_report_due_date: string
  days_overdue: number
  amount: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function firstDayOfCurrentMonthISO() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

export function BatchReportButton() {
  const router = useRouter()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [contracts, setContracts] = useState<DueContract[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [growthRate, setGrowthRate] = useState('')
  const [periodStart, setPeriodStart] = useState(firstDayOfCurrentMonthISO())
  const [periodEnd, setPeriodEnd] = useState(todayISO())
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    async function load() {
      try {
        const res = await fetch('/api/reports/due', { cache: 'no-store' })
        const json = await res.json()
        const items: DueContract[] = json.items ?? []
        if (!cancelled) {
          setContracts(items)
          // Pre-select only the ones currently overdue (days_overdue >= 0)
          setSelectedIds(
            new Set(items.filter((c) => c.days_overdue >= 0).map((c) => c.contract_id))
          )
        }
      } catch {
        if (!cancelled) toast.error('Error al cargar contratos pendientes')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const growthRateNum = Number(growthRate) || 0
  const selectedContracts = contracts.filter((c) => selectedIds.has(c.contract_id))
  const totalRendimiento = selectedContracts.reduce(
    (sum, c) => sum + (c.amount * growthRateNum) / 100,
    0
  )

  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === contracts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(contracts.map((c) => c.contract_id)))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedIds.size === 0) {
      toast.error('Selecciona al menos un contrato')
      return
    }
    if (!growthRate || Number.isNaN(growthRateNum)) {
      toast.error('Ingresá la tasa de crecimiento del fondo')
      return
    }
    if (!periodStart || !periodEnd) {
      toast.error('Ingresá el período')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/reports/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          growth_rate: growthRateNum,
          period_start: periodStart,
          period_end: periodEnd,
          description: description.trim() || null,
          contract_ids: Array.from(selectedIds),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Error al generar reportes')
        return
      }

      toast.success(`${data.created} reporte${data.created !== 1 ? 's' : ''} generado${data.created !== 1 ? 's' : ''}`)
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
      >
        <FileBarChart size={15} />
        Generar reportes del período
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !submitting && setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <h2 className="text-base font-semibold text-zinc-900">
                Generar reportes del período
              </h2>
              <button
                type="button"
                onClick={() => !submitting && setOpen(false)}
                className="rounded-md p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-5">
                {/* Explanation */}
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 flex items-start gap-2">
                  <Info size={14} className="text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-900 leading-relaxed">
                    Vas a crear un reporte para cada inversionista seleccionado. El sistema
                    calculará automáticamente cuánto rendimiento generó cada uno según su
                    capital invertido y la tasa de crecimiento del fondo en el período.
                  </p>
                </div>

                {/* Period */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="batch-period-start" className="block text-sm font-medium text-zinc-700 mb-1">
                      Inicio del período
                    </label>
                    <input
                      id="batch-period-start"
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="batch-period-end" className="block text-sm font-medium text-zinc-700 mb-1">
                      Fin del período
                    </label>
                    <input
                      id="batch-period-end"
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                </div>

                {/* Growth rate */}
                <div>
                  <label htmlFor="batch-growth" className="block text-sm font-medium text-zinc-700 mb-1">
                    ¿Cuánto creció el fondo en este período? (%)
                  </label>
                  <div className="relative">
                    <input
                      id="batch-growth"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ej: 10"
                      value={growthRate}
                      onChange={(e) => setGrowthRate(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">%</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Ejemplo: si el fondo creció un 10% durante el período, ingresá <strong>10</strong>.
                    Este porcentaje se aplicará al capital de cada inversionista.
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="batch-desc" className="block text-sm font-medium text-zinc-700 mb-1">
                    Descripción del período <span className="text-zinc-400 font-normal">(opcional)</span>
                  </label>
                  <textarea
                    id="batch-desc"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ej: En estos dos meses se trabajó sobre el movimiento del oro y noticias importantes que permitieron ganar rentabilidad."
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                {/* Contracts list */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-zinc-700">
                      Inversionistas que recibirán el reporte
                    </label>
                    {contracts.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleAll}
                        className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
                      >
                        {selectedIds.size === contracts.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                      </button>
                    )}
                  </div>

                  {loading ? (
                    <div className="text-center py-6">
                      <Loader2 size={20} className="animate-spin mx-auto text-zinc-400" />
                    </div>
                  ) : contracts.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-6">
                      No hay contratos pendientes de reporte en este momento.
                    </p>
                  ) : (
                    <div className="rounded-lg border border-zinc-200 max-h-60 overflow-y-auto divide-y divide-zinc-100">
                      {contracts.map((c) => {
                        const isSelected = selectedIds.has(c.contract_id)
                        const calculatedAmount = (c.amount * growthRateNum) / 100
                        return (
                          <label
                            key={c.contract_id}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-zinc-50 transition-colors',
                              isSelected && 'bg-zinc-50'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleId(c.contract_id)}
                              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-900 truncate">
                                {c.holder_name ?? '—'}
                              </p>
                              <p className="text-xs text-zinc-500 truncate">
                                {c.plan_name} · Capital {formatCurrency(c.amount)}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              {growthRateNum > 0 ? (
                                <p className="text-sm font-semibold text-green-700">
                                  +{formatCurrency(calculatedAmount)}
                                </p>
                              ) : (
                                <p className="text-xs text-zinc-400">—</p>
                              )}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Summary */}
                {selectedContracts.length > 0 && growthRateNum > 0 && (
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-700">
                        {selectedContracts.length} reporte{selectedContracts.length !== 1 ? 's' : ''} a generar
                      </p>
                      <p className="text-sm font-semibold text-green-900 mt-0.5">
                        Rendimiento total comunicado: {formatCurrency(totalRendimiento)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-5 py-4 border-t border-zinc-100 flex flex-col sm:flex-row sm:justify-end gap-2 bg-zinc-50">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-white disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || selectedIds.size === 0 || !growthRate}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Generar reportes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
