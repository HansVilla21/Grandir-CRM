'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FileText } from 'lucide-react'
import { PaymentForm } from '../../payments/_components/payment-form'
import { PaymentVerifyButton } from '../../payments/_components/payment-verify-button'
import type { ContractPaymentDetail } from '@/types/contracts'
import type { ContractOption } from '@/types/payments'

interface ContractPaymentsSectionProps {
  contractId: string
  payments: ContractPaymentDetail[]
  contracts: ContractOption[]
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  deposit: 'Depósito',
  withdrawal: 'Retiro',
  commission: 'Comisión',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' }).format(new Date(dateStr))
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
      {PAYMENT_TYPE_LABELS[type] ?? type}
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

export function ContractPaymentsSection({
  contractId,
  payments,
  contracts,
}: ContractPaymentsSectionProps) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)

  const totalDeposited = payments
    .filter((p) => p.type === 'deposit')
    .reduce((sum, p) => sum + p.amount, 0)

  const totalWithdrawn = payments
    .filter((p) => p.type === 'withdrawal')
    .reduce((sum, p) => sum + p.amount, 0)

  function handleSuccess() {
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="text-sm font-semibold text-zinc-900">Pagos</h2>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-100 border border-zinc-200 rounded-lg hover:bg-zinc-200 transition-colors w-full sm:w-auto"
        >
          <Plus size={13} />
          Registrar pago
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg bg-green-50 px-4 py-3">
          <p className="text-xs text-green-700 font-medium">Total depositado</p>
          <p className="text-base font-semibold text-green-900 mt-0.5">
            {formatCurrency(totalDeposited)}
          </p>
        </div>
        <div className="rounded-lg bg-red-50 px-4 py-3">
          <p className="text-xs text-red-700 font-medium">Total retirado</p>
          <p className="text-base font-semibold text-red-900 mt-0.5">
            {formatCurrency(totalWithdrawn)}
          </p>
        </div>
      </div>

      {payments.length === 0 ? (
        <p className="text-sm text-zinc-500">Sin pagos registrados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left pl-4 sm:pl-6 pr-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Tipo
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Monto
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Fecha
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
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="pl-4 sm:pl-6 pr-4 py-3">
                    <TypeBadge type={payment.type} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-zinc-900">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 text-xs whitespace-nowrap">
                    {formatDate(payment.payment_date)}
                  </td>
                  <td className="px-4 py-3">
                    {payment.receipt_path ? (
                      <ReceiptLink path={payment.receipt_path} />
                    ) : (
                      <span className="text-zinc-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                        payment.verified
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}
                    >
                      {payment.verified ? 'Verificado' : 'Pendiente'}
                    </span>
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

      {/* Payment form modal */}
      <PaymentForm
        contracts={contracts}
        defaultContractId={contractId}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  )
}
