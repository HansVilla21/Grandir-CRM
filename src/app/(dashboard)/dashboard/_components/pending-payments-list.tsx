import Link from 'next/link'

interface PendingPayment {
  id: string
  contract_id: string
  holder_name: string
  amount: number
  type: string
  payment_date: string
  created_at: string
}

interface PendingPaymentsListProps {
  payments: PendingPayment[]
}

const TYPE_LABELS: Record<string, string> = {
  deposit: 'Depósito',
  withdrawal: 'Retiro',
  commission: 'Comisión',
}

const TYPE_STYLES: Record<string, string> = {
  deposit: 'bg-green-50 text-green-700 border-green-200',
  withdrawal: 'bg-red-50 text-red-700 border-red-200',
  commission: 'bg-blue-50 text-blue-700 border-blue-200',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' }).format(new Date(dateStr))
}

export function PendingPaymentsList({ payments }: PendingPaymentsListProps) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-100">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Pagos pendientes de verificar</h2>
          <p className="mt-0.5 text-xs text-zinc-400">Últimos 5 sin verificar</p>
        </div>
        <Link
          href="/dashboard/payments"
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          Ver todos
        </Link>
      </div>
      <div className="px-4 sm:px-6 py-2">
        {payments.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400">
            Sin pagos pendientes de verificación.
          </p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left py-3 pl-4 sm:pl-6 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Titular
                </th>
                <th className="text-left py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Tipo
                </th>
                <th className="text-right py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Monto
                </th>
                <th className="text-left py-3 pr-4 sm:pr-6 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Fecha pago
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="py-3 pl-4 sm:pl-6 font-medium text-zinc-900">
                    {payment.holder_name}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                        TYPE_STYLES[payment.type] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                      }`}
                    >
                      {TYPE_LABELS[payment.type] ?? payment.type}
                    </span>
                  </td>
                  <td className="py-3 text-right font-mono font-semibold text-zinc-900">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="py-3 pr-4 sm:pr-6 text-xs text-zinc-500">
                    {formatDate(payment.payment_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
