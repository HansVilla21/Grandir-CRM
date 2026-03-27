import Link from 'next/link'

interface ExpiringContract {
  id: string
  holder_name: string
  plan_name: string
  amount: number
  end_date: string
}

interface ExpiringContractsProps {
  contracts: ExpiringContract[]
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' }).format(new Date(dateStr))
}

function getDaysLeft(endDate: string): number {
  return Math.ceil(
    (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
}

export function ExpiringContracts({ contracts }: ExpiringContractsProps) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm">
      <div className="px-4 sm:px-6 py-4 border-b border-zinc-100">
        <h2 className="text-sm font-semibold text-zinc-900">Próximos a vencer</h2>
        <p className="mt-0.5 text-xs text-zinc-400">Contratos activos que vencen en los próximos 60 días</p>
      </div>
      <div className="px-4 sm:px-6 py-2">
        {contracts.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400">
            Sin contratos próximos a vencer.
          </p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[540px]">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left py-3 pl-4 sm:pl-6 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Titular
                </th>
                <th className="text-left py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Plan
                </th>
                <th className="text-right py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Monto
                </th>
                <th className="text-left py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Vence
                </th>
                <th className="text-right py-3 pr-4 sm:pr-6 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Días
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {contracts.map((contract) => {
                const daysLeft = getDaysLeft(contract.end_date)
                const daysColor =
                  daysLeft <= 30 ? 'text-red-600' : 'text-yellow-600'
                return (
                  <tr key={contract.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-3 pl-4 sm:pl-6 font-medium text-zinc-900">
                      <Link
                        href={`/dashboard/contracts/${contract.id}`}
                        className="hover:underline underline-offset-2"
                      >
                        {contract.holder_name}
                      </Link>
                    </td>
                    <td className="py-3 text-zinc-600">{contract.plan_name}</td>
                    <td className="py-3 text-right font-mono text-zinc-700">
                      {formatCurrency(contract.amount)}
                    </td>
                    <td className="py-3 text-zinc-500 text-xs">
                      {formatDate(contract.end_date)}
                    </td>
                    <td className={`py-3 pr-4 sm:pr-6 text-right font-semibold text-sm ${daysColor}`}>
                      {daysLeft}d
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
