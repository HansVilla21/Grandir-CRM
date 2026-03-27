'use client'

import { useState } from 'react'

interface PortalRevisionButtonProps {
  token: string
}

export function PortalRevisionButton({ token }: PortalRevisionButtonProps) {
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/portal/${token}/revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: comment.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (data.error === 'ALREADY_PROCESSED') {
          setError('Este contrato ya fue procesado anteriormente.')
        } else {
          setError('Ocurrió un error. Intenta de nuevo.')
        }
        return
      }

      setSuccess(true)
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
      <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-amber-800 text-sm font-medium">
        Tu solicitud de revision fue enviada. Actualizando...
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-zinc-300 bg-white px-6 py-3 text-zinc-700 font-semibold text-base hover:bg-zinc-50 transition-colors"
      >
        Solicitar cambios
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label
          htmlFor="revision-comment"
          className="block text-sm font-medium text-zinc-700 mb-1"
        >
          Describe los cambios que necesitas
        </label>
        <textarea
          id="revision-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="Ejemplo: El monto indicado no coincide con lo acordado. Solicito revisión del punto 3..."
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 resize-none"
          required
          maxLength={2000}
        />
        <p className="text-xs text-zinc-400 mt-1 text-right">{comment.length}/2000</p>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setComment(''); setError(null) }}
          disabled={loading}
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-700 text-sm font-medium hover:bg-zinc-50 transition-colors disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !comment.trim()}
          className="flex-1 rounded-lg bg-zinc-800 px-4 py-2 text-white text-sm font-semibold hover:bg-zinc-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Enviando...' : 'Enviar solicitud'}
        </button>
      </div>
    </form>
  )
}
