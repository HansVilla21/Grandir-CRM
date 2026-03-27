'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { CommissionPayButton } from './commission-pay-button'
import type { ReferralCommissionItem } from '@/types/referrals'

interface ReferralsTableProps {
  commissions: ReferralCommissionItem[]
}

type PaidFilter = 'all' | 'pending' | 'paid'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' }).format(new Date(dateStr))
}

export function ReferralsTable({ commissions }: ReferralsTableProps) {
  const [paidFilter, setPaidFilter] = useState<PaidFilter>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return commissions.filter((c) => {
      if (paidFilter === 'pending' && c.paid) return false
      if (paidFilter === 'paid' && !c.paid) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !c.referrer_name.toLowerCase().includes(q) &&
          !c.referred_name.toLowerCase().includes(q)
        ) {
          return false
        }
      }
      return true
    })
  }, [commissions, paidFilter, search])

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar referidor o referido..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg bg-zinc-50 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>

        <select
          value={paidFilter}
          onChange={(e) => setPaidFilter(e.target.value as PaidFilter)}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-zinc-50 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
        >
          <option value="all">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="paid">Pagada</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-zinc-400">
          Sin comisiones que coincidan con los filtros.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                  Referidor
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                  Referido
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                  Plan
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                  Contrato
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                  Comisión
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Estado
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                  Fecha
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((commission) => (
                <tr key={commission.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap">
                    {commission.referrer_name}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 whitespace-nowrap">
                    {commission.referred_name}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                    {commission.plan_name}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-700 whitespace-nowrap">
                    {formatCurrency(commission.contract_amount)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-900 whitespace-nowrap">
                    {formatCurrency(commission.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <PaidBadge paid={commission.paid} />
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                    {formatDate(commission.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    {!commission.paid ? (
                      <CommissionPayButton
                        commissionId={commission.id}
                        amount={commission.amount}
                      />
                    ) : (
                      <span className="text-xs text-zinc-400">
                        {commission.paid_at ? formatDate(commission.paid_at) : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <p className="mt-3 text-xs text-zinc-400">
          {filtered.length} comisión{filtered.length !== 1 ? 'es' : ''}
        </p>
      )}
    </>
  )
}

function PaidBadge({ paid }: { paid: boolean }) {
  if (paid) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200">
        Pagada
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
      Pendiente
    </span>
  )
}
