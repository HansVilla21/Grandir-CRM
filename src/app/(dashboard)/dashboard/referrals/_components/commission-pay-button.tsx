'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'

interface CommissionPayButtonProps {
  commissionId: string
  amount: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function CommissionPayButton({ commissionId, amount }: CommissionPayButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [optimisticPaid, setOptimisticPaid] = useState(false)

  if (optimisticPaid) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
        <CheckCircle size={13} />
        Pagada
      </span>
    )
  }

  async function handlePay() {
    const confirmed = window.confirm(
      `¿Confirmar pago de comisión por ${formatCurrency(amount)}?`
    )
    if (!confirmed) return

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
        alert(data.error ?? 'Error al marcar la comisión como pagada')
        return
      }

      router.refresh()
    } catch {
      setOptimisticPaid(false)
      alert('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handlePay}
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
  )
}
