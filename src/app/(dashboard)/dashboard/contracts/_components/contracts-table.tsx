'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ContractStatusBadge } from './contract-status-badge'
import type { ContractListItem, ContractStatus } from '@/types/contracts'

interface Plan {
  id: string
  name: string
}

interface ContractsTableProps {
  contracts: ContractListItem[]
  plans: Plan[]
}

type StatusFilter = 'all' | ContractStatus

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'draft', label: 'Borrador' },
  { value: 'pending_approval', label: 'Pendiente' },
  { value: 'active', label: 'Activo' },
  { value: 'expired', label: 'Vencido' },
  { value: 'cancelled', label: 'Cancelado' },
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' }).format(
    new Date(dateStr)
  )
}

export function ContractsTable({ contracts, plans }: ContractsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    let result = contracts

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter)
    }

    if (planFilter !== 'all') {
      result = result.filter((c) => c.plan_id === planFilter)
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (c) => c.holder_name?.toLowerCase().includes(q) ?? false
      )
    }

    return result
  }, [contracts, statusFilter, planFilter, search])

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Contratos</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {contracts.length} contrato{contracts.length !== 1 ? 's' : ''} registrado
            {contracts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/contracts/new')}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors w-full sm:w-auto"
        >
          <Plus size={15} />
          Nuevo contrato
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Buscar por inversionista..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-colors"
            />
          </div>

          {/* Plan filter */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-colors"
          >
            <option value="all">Todos los planes</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 gap-0.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                statusFilter === tab.value
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={36} className="text-zinc-300 mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-zinc-500">
              {search || statusFilter !== 'all' || planFilter !== 'all'
                ? 'No se encontraron resultados'
                : 'Sin contratos registrados'}
            </p>
            {!search && statusFilter === 'all' && planFilter === 'all' && (
              <button
                type="button"
                onClick={() => router.push('/dashboard/contracts/new')}
                className="mt-3 text-sm text-zinc-900 underline underline-offset-2 hover:text-zinc-700"
              >
                Crear el primero
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="text-left pl-4 sm:pl-6 pr-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    ID
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Inversionista
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Plan
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Monto
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Inicio
                  </th>
                  <th className="text-left pl-4 pr-4 sm:pr-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Plazo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((contract) => (
                  <tr
                    key={contract.id}
                    onClick={() =>
                      router.push(`/dashboard/contracts/${contract.id}`)
                    }
                    className="hover:bg-zinc-50 cursor-pointer transition-colors"
                  >
                    <td className="pl-4 sm:pl-6 pr-4 py-3">
                      <span className="font-mono text-xs text-zinc-500">
                        {contract.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-900">
                        {contract.holder_name ?? (
                          <span className="text-zinc-400 italic">Sin titular</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {contract.plan_name}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-900">
                      {formatCurrency(contract.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <ContractStatusBadge status={contract.status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {formatDate(contract.start_date)}
                    </td>
                    <td className="pl-4 pr-4 sm:pr-6 py-3 text-zinc-600">
                      {contract.term_months} mes{contract.term_months !== 1 ? 'es' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="mt-3 text-xs text-zinc-400">
          Mostrando {filtered.length} de {contracts.length} contratos
        </p>
      )}
    </>
  )
}
