'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

interface DueReport {
  contract_id: string
  holder_name: string | null
  plan_name: string
  next_report_due_date: string
  days_overdue: number
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es-CR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr + 'T12:00:00'))
}

export function ReportsDueAlert() {
  const [items, setItems] = useState<DueReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/reports/due')
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) setItems(json.items ?? [])
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return null

  const overdue = items.filter((i) => i.days_overdue >= 0)
  if (overdue.length === 0) return null

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 sm:p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="rounded-md bg-orange-100 p-1.5 shrink-0">
          <AlertTriangle size={14} className="text-orange-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-orange-900">
            {overdue.length} contrato{overdue.length !== 1 ? 's' : ''} sin reporte reciente
          </h3>
          <p className="text-xs text-orange-700 mt-0.5">
            Generá los reportes del período con el botón <strong>Generar reportes del período</strong> de arriba —
            solo ingresás la tasa de crecimiento del fondo una vez y el sistema crea todos a la vez.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {overdue.slice(0, 5).map((item) => (
          <div
            key={item.contract_id}
            className="flex items-center justify-between gap-3 rounded-lg bg-white border border-orange-100 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-900 truncate">
                {item.holder_name ?? '—'}
              </p>
              <p className="text-xs text-zinc-500 truncate">
                {item.plan_name} · Esperado: {formatDate(item.next_report_due_date)}
              </p>
            </div>
            <span className="text-xs font-semibold text-orange-700 shrink-0">
              {item.days_overdue === 0 ? 'Hoy' : `${item.days_overdue}d atrasado`}
            </span>
          </div>
        ))}
      </div>

      {overdue.length > 5 && (
        <p className="text-xs text-orange-700 mt-3 text-center">
          + {overdue.length - 5} más
        </p>
      )}
    </div>
  )
}
