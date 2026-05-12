'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Calendar, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PaymentsTable } from './payments-table'
import { UpcomingPaymentsSection } from './upcoming-payments-section'
import { PaymentForm } from './payment-form'
import type { PaymentListItem, ContractOption } from '@/types/payments'

interface PaymentsPageTabsProps {
  initialPayments: PaymentListItem[]
  contracts: ContractOption[]
}

type Tab = 'upcoming' | 'history'

interface PrefillState {
  contractId: string
  amount: number
  date: string
  description: string
}

export function PaymentsPageTabs({ initialPayments, contracts }: PaymentsPageTabsProps) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('upcoming')
  const [formOpen, setFormOpen] = useState(false)
  const [prefill, setPrefill] = useState<PrefillState | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  function handleRegisterPayment(args: {
    contractId: string
    amount: number
    date: string
    description: string
  }) {
    setPrefill(args)
    setFormOpen(true)
  }

  function handleSuccess() {
    setFormOpen(false)
    setPrefill(null)
    setRefreshKey((k) => k + 1) // re-fetch upcoming payments
    router.refresh() // re-fetch server-rendered history table
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-lg p-0.5 w-full sm:w-fit">
        <TabButton
          current={tab}
          value="upcoming"
          label="Próximos pagos"
          icon={Calendar}
          onClick={setTab}
        />
        <TabButton
          current={tab}
          value="history"
          label="Historial"
          icon={ListChecks}
          onClick={setTab}
        />
      </div>

      {tab === 'upcoming' ? (
        <UpcomingPaymentsSection
          onRegisterPayment={handleRegisterPayment}
          refreshKey={refreshKey}
        />
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-4 sm:p-6">
          <PaymentsTable initialPayments={initialPayments} contracts={contracts} />
        </div>
      )}

      <PaymentForm
        contracts={contracts}
        defaultContractId={prefill?.contractId}
        defaultType="withdrawal"
        defaultAmount={prefill?.amount}
        defaultDate={prefill?.date}
        defaultNotes={prefill?.description}
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setPrefill(null)
        }}
        onSuccess={handleSuccess}
      />
    </div>
  )
}

function TabButton({
  current,
  value,
  label,
  icon: Icon,
  onClick,
}: {
  current: Tab
  value: Tab
  label: string
  icon: typeof Calendar
  onClick: (v: Tab) => void
}) {
  const isActive = current === value
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={cn(
        'flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors flex-1 sm:flex-none justify-center',
        isActive ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
      )}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}
