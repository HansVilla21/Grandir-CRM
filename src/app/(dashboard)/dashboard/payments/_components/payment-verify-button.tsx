'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'

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
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [optimisticVerified, setOptimisticVerified] = useState(verified)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (optimisticVerified) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
        <CheckCircle size={13} />
        Verificado
      </span>
    )
  }

  async function handleConfirm() {
    setLoading(true)
    setOptimisticVerified(true) // optimistic

    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
      })

      if (!res.ok) {
        setOptimisticVerified(false)
        const data = await res.json()
        toast.error(data.error ?? 'Error al verificar el pago')
        return
      }

      setConfirmOpen(false)
      toast.success(`Pago de ${formatCurrency(amount)} verificado`)
      router.refresh()
    } catch {
      setOptimisticVerified(false)
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

      <ConfirmDialog
        open={confirmOpen}
        title="Verificar pago"
        description={`¿Confirmás la verificación del pago de ${formatCurrency(amount)}?`}
        confirmLabel="Verificar"
        variant="success"
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
