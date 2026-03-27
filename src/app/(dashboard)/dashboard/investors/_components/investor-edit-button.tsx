'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { InvestorForm } from './investor-form'
import type { Investor } from '@/types/investors'

interface InvestorEditButtonProps {
  investor: Investor
  activeInvestors: { id: string; full_name: string }[]
}

export function InvestorEditButton({ investor, activeInvestors }: InvestorEditButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
      >
        <Pencil size={13} />
        Editar
      </button>

      <InvestorForm
        open={open}
        onClose={() => setOpen(false)}
        investor={investor}
        activeInvestors={activeInvestors}
      />
    </>
  )
}
