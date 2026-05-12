'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'

interface CommissionPayButtonProps {
  commissionId: string
  amount: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function CommissionPayButton({ commissionId, amount }: CommissionPayButtonProps) {
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [optimisticPaid, setOptimisticPaid] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (optimisticPaid) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
        <CheckCircle size={13} />
        Pagada
      </span>
    )
  }

  async function handleConfirm() {
    setLoading(true)
    setOptimisticPaid(true)

    try {
      const res = await fetch(`/api/referrals/${commissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pay' }),
      })

      if (!res.ok) {
        setOptimisticPaid(false)
        const data = await res.json()
        toast.error(data.error ?? 'Error al marcar la comisión como pagada')
        return
      }

      setConfirmOpen(false)
      toast.success(`Comisión de ${formatCurrency(amount)} marcada como pagada`)
      router.refresh()
    } catch {
      setOptimisticPaid(false)
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={loading || optimisticPaid}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-700 bg-zinc-100 border border-zinc-200 rounded-md hover:bg-zinc-200 hover:border-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <CheckCircle size={12} />
        )}
        Marcar pagada
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title="Marcar comisión como pagada"
        description={`¿Confirmás el pago de la comisión por ${formatCurrency(amount)}?`}
        confirmLabel="Marcar pagada"
        variant="success"
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
