'use client'

import { useState } from 'react'

interface PortalApproveButtonProps {
  token: string
  amount: number
}

export function PortalApproveButton({ token, amount }: PortalApproveButtonProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formattedAmount = new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)

  async function handleApprove() {
    const confirmed = window.confirm(
      `¿Confirmas tu aprobación del contrato de inversión por ${formattedAmount}?\n\nEsta acción no se puede deshacer.`
    )
    if (!confirmed) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/portal/${token}/approve`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        if (data.error === 'ALREADY_PROCESSED') {
          setError('Este contrato ya fue procesado anteriormente.')
        } else {
          setError('Ocurrió un error al procesar tu aprobación. Intenta de nuevo.')
        }
        return
      }

      setSuccess(true)
      // Recargar la página para reflejar el nuevo estado
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm font-medium">
        Aprobacion registrada exitosamente. Actualizando...
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleApprove}
        disabled={loading}
        className="w-full rounded-lg bg-green-600 px-6 py-3 text-white font-semibold text-base hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Procesando...' : 'Aprobar contrato'}
      </button>
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  )
}
