'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { InvestorForm } from './investor-form'
import type { InvestorWithEmail } from '@/types/investors'

interface InvestorsTableProps {
  investors: InvestorWithEmail[]
  activeInvestors: { id: string; full_name: string }[]
}

type StatusFilter = 'all' | 'active' | 'inactive'

function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border',
        status === 'active'
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-zinc-100 text-zinc-500 border-zinc-200'
      )}
    >
      {status === 'active' ? 'Activo' : 'Inactivo'}
    </span>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function InvestorsTable({ investors, activeInvestors }: InvestorsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [formOpen, setFormOpen] = useState(false)

  const filtered = useMemo(() => {
    let result = investors

    if (statusFilter !== 'all') {
      result = result.filter((inv) => inv.status === statusFilter)
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (inv) =>
          inv.full_name.toLowerCase().includes(q) ||
          inv.cedula.toLowerCase().includes(q) ||
          (inv.primary_email?.toLowerCase().includes(q) ?? false)
      )
    }

    return result
  }, [investors, statusFilter, search])

  const statusTabs: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
  ]

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Inversionistas</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {investors.length} inversionista{investors.length !== 1 ? 's' : ''} registrado{investors.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <Plus size={15} />
          Nuevo inversionista
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Buscar por nombre, cédula o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-colors"
          />
        </div>

        {/* Status tabs */}
        <div className="flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 gap-0.5">
          {statusTabs.map((tab) => (
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
            <Users size={36} className="text-zinc-300 mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-zinc-500">
              {search || statusFilter !== 'all'
                ? 'No se encontraron resultados'
                : 'Sin inversionistas registrados'}
            </p>
            {!search && statusFilter === 'all' && (
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="mt-3 text-sm text-zinc-900 underline underline-offset-2 hover:text-zinc-700"
              >
                Crear el primero
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Nombre
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Cédula
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Teléfono
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Registro
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((investor) => (
                  <tr
                    key={investor.id}
                    onClick={() => router.push(`/dashboard/investors/${investor.id}`)}
                    className="hover:bg-zinc-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-900">{investor.full_name}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 font-mono text-xs">
                      {investor.cedula}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {investor.primary_email ?? (
                        <span className="text-zinc-400 italic">Sin email</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {investor.phone ?? (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={investor.status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {formatDate(investor.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer count */}
      {filtered.length > 0 && (
        <p className="mt-3 text-xs text-zinc-400">
          Mostrando {filtered.length} de {investors.length} inversionistas
        </p>
      )}

      {/* New investor modal */}
      <InvestorForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        activeInvestors={activeInvestors}
      />
    </>
  )
}
