'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'

interface PaymentVerifyButtonProps {
  paymentId: string
  verified: boolean
  amount: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function PaymentVerifyButton({ paymentId, verified, amount }: PaymentVerifyButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [optimisticVerified, setOptimisticVerified] = useState(verified)

  if (optimisticVerified) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
        <CheckCircle size={13} />
        Verificado
      </span>
    )
  }

  async function handleVerify() {
    const confirmed = window.confirm(
      `¿Confirmar verificación de ${formatCurrency(amount)}?`
    )
    if (!confirmed) return

    setLoading(true)
    setOptimisticVerified(true) // optimistic

    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
      })

      if (!res.ok) {
        // Revert optimistic update
        setOptimisticVerified(false)
        const data = await res.json()
        alert(data.error ?? 'Error al verificar el pago')
        return
      }

      router.refresh()
    } catch {
      setOptimisticVerified(false)
      alert('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleVerify}
      disabled={loading || optimisticVerified}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-700 bg-zinc-100 border border-zinc-200 rounded-md hover:bg-zinc-200 hover:border-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <CheckCircle size={12} />
      )}
      Verificar
    </button>
  )
}
