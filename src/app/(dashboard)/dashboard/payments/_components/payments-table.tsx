'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Plus, Search } from 'lucide-react'
import { PaymentForm } from './payment-form'
import { PaymentVerifyButton } from './payment-verify-button'
import type { PaymentListItem, ContractOption } from '@/types/payments'

interface PaymentsTableProps {
  initialPayments: PaymentListItem[]
  contracts: ContractOption[]
}

const TYPE_LABELS: Record<string, string> = {
  deposit: 'Depósito',
  withdrawal: 'Retiro',
  commission: 'Comisión',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' }).format(new Date(dateStr))
}

type TypeFilter = 'all' | 'deposit' | 'withdrawal' | 'commission'
type VerifiedFilter = 'all' | 'pending' | 'verified'

export function PaymentsTable({ initialPayments, contracts }: PaymentsTableProps) {
  const router = useRouter()
  const [payments, setPayments] = useState(initialPayments)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [verifiedFilter, setVerifiedFilter] = useState<VerifiedFilter>('all')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  // Client-side filtering
  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false
      if (verifiedFilter === 'pending' && p.verified) return false
      if (verifiedFilter === 'verified' && !p.verified) return false
      if (search && !p.holder_name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [payments, typeFilter, verifiedFilter, search])

  function handleSuccess() {
    router.refresh()
  }

  // Keep payments in sync after refresh (server component re-renders provide new props)
  // We use initialPayments as the source — router.refresh() will re-render the page
  // and pass new initialPayments, so we need to sync
  // Using a key-based reset is handled by the page re-render

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar inversionista..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg bg-zinc-50 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-zinc-50 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
        >
          <option value="all">Todos los tipos</option>
          <option value="deposit">Depósito</option>
          <option value="withdrawal">Retiro</option>
          <option value="commission">Comisión</option>
        </select>

        {/* Verified filter */}
        <select
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value as VerifiedFilter)}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-zinc-50 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
        >
          <option value="all">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="verified">Verificados</option>
        </select>

        {/* Register button */}
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 transition-colors shrink-0 w-full sm:w-auto"
        >
          <Plus size={14} />
          Registrar pago
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-zinc-400">
          Sin pagos que coincidan con los filtros.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left pl-4 sm:pl-6 pr-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                  Fecha
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                  Inversionista
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                  Plan
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Tipo
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Monto
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Comprobante
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Estado
                </th>
                <th className="text-left pl-4 pr-4 sm:pr-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((payment) => (
                <tr key={payment.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="pl-4 sm:pl-6 pr-4 py-3 text-xs text-zinc-600 whitespace-nowrap">
                    {formatDate(payment.payment_date)}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {payment.holder_name}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                    {payment.plan_name}
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={payment.type} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-zinc-900 whitespace-nowrap">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-4 py-3">
                    {payment.receipt_path ? (
                      <ReceiptLink path={payment.receipt_path} />
                    ) : (
                      <span className="text-zinc-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <VerifiedBadge verified={payment.verified} />
                  </td>
                  <td className="pl-4 pr-4 sm:pr-6 py-3">
                    <PaymentVerifyButton
                      paymentId={payment.id}
                      verified={payment.verified}
                      amount={payment.amount}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Count */}
      {filtered.length > 0 && (
        <p className="mt-3 text-xs text-zinc-400">
          {filtered.length} pago{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Payment form modal */}
      <PaymentForm
        contracts={contracts}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  )
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    deposit: 'bg-green-50 text-green-700 border-green-200',
    withdrawal: 'bg-red-50 text-red-700 border-red-200',
    commission: 'bg-blue-50 text-blue-700 border-blue-200',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${styles[type] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  )
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200">
        Verificado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
      Pendiente
    </span>
  )
}

function ReceiptLink({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    if (url) {
      window.open(url, '_blank')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/payments/receipt-url?path=${encodeURIComponent(path)}`)
      const data = await res.json()
      if (data.url) {
        setUrl(data.url)
        window.open(data.url, '_blank')
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900 underline underline-offset-2 disabled:opacity-50 transition-colors"
    >
      <FileText size={12} />
      {loading ? 'Cargando...' : 'Ver comprobante'}
    </button>
  )
}
