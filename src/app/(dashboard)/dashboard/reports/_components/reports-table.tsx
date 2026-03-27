'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReportForm } from './report-form'
import type { ReportListItem, ReportStatus, ContractForReportForm } from '@/types/reports'

interface ReportsTableProps {
  reports: ReportListItem[]
  contracts: ContractForReportForm[]
  defaultContractId?: string
}

type StatusFilter = 'all' | ReportStatus

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'generated', label: 'PDF listo' },
  { value: 'sent', label: 'Enviado' },
]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const normalized = dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00'
  const d = new Date(normalized)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' }).format(d)
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const config: Record<ReportStatus, { label: string; className: string }> = {
    pending: {
      label: 'Pendiente',
      className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    },
    generated: {
      label: 'PDF listo',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    sent: {
      label: 'Enviado',
      className: 'bg-green-50 text-green-700 border-green-200',
    },
  }

  const { label, className } = config[status] ?? {
    label: status,
    className: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${className}`}
    >
      {label}
    </span>
  )
}

export function ReportsTable({ reports, contracts, defaultContractId }: ReportsTableProps) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filtered =
    statusFilter === 'all' ? reports : reports.filter((r) => r.status === statusFilter)

  function handleRowClick(id: string) {
    router.push(`/dashboard/reports/${id}`)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                statusFilter === tab.value
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <ReportForm
          contracts={contracts}
          onSuccess={() => router.refresh()}
          defaultContractId={defaultContractId}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                Período
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Inversionista
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Plan
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                Tasa (%)
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                Monto
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Estado
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                Fecha envío
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-400">
                  No hay reportes
                  {statusFilter !== 'all' ? ` con estado "${STATUS_TABS.find(t => t.value === statusFilter)?.label}"` : ''}.
                </td>
              </tr>
            ) : (
              filtered.map((report) => (
                <tr
                  key={report.id}
                  onClick={() => handleRowClick(report.id)}
                  className="cursor-pointer hover:bg-zinc-50 transition-colors"
                >
                  <td className="px-4 py-3 text-xs text-zinc-600 whitespace-nowrap">
                    {formatDate(report.period_start)} — {formatDate(report.period_end)}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {report.holder_name}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{report.plan_name}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-700">
                    {report.growth_rate.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-700">
                    {report.calculated_amount != null
                      ? formatCurrency(report.calculated_amount)
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={report.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                    {formatDate(report.sent_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
