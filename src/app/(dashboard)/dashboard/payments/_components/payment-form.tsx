'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Loader2, Upload } from 'lucide-react'
import type { ContractOption } from '@/types/payments'

interface PaymentFormProps {
  contracts: ContractOption[]
  defaultContractId?: string
  defaultType?: 'deposit' | 'withdrawal' | 'commission'
  defaultAmount?: number
  defaultDate?: string
  defaultNotes?: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const TYPE_OPTIONS = [
  { value: 'deposit', label: 'Depósito' },
  { value: 'withdrawal', label: 'Retiro' },
  { value: 'commission', label: 'Comisión' },
] as const

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export function PaymentForm({
  contracts,
  defaultContractId,
  defaultType,
  defaultAmount,
  defaultDate,
  defaultNotes,
  open,
  onClose,
  onSuccess,
}: PaymentFormProps) {
  const [contractId, setContractId] = useState(defaultContractId ?? '')
  const [type, setType] = useState<'deposit' | 'withdrawal' | 'commission'>(defaultType ?? 'deposit')
  const [amount, setAmount] = useState(defaultAmount ? defaultAmount.toFixed(2) : '')
  const [paymentDate, setPaymentDate] = useState(defaultDate ?? todayISO())
  const [notes, setNotes] = useState(defaultNotes ?? '')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const firstInputRef = useRef<HTMLSelectElement>(null)

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setContractId(defaultContractId ?? '')
      setType(defaultType ?? 'deposit')
      setAmount(defaultAmount ? defaultAmount.toFixed(2) : '')
      setPaymentDate(defaultDate ?? todayISO())
      setNotes(defaultNotes ?? '')
      setReceiptFile(null)
      setError(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setTimeout(() => firstInputRef.current?.focus(), 50)
    }
  }, [open, defaultContractId, defaultType, defaultAmount, defaultDate, defaultNotes])

  // Trap Escape key
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!contractId) {
      setError('Selecciona un contrato')
      return
    }
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('El monto debe ser un número positivo')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('contract_id', contractId)
      formData.append('amount', String(amountNum))
      formData.append('type', type)
      formData.append('payment_date', paymentDate)
      if (notes.trim()) formData.append('notes', notes.trim())
      if (receiptFile) formData.append('receipt', receiptFile)

      const res = await fetch('/api/payments', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al registrar el pago')
        return
      }

      onSuccess()
      onClose()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-form-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-white rounded-xl border border-zinc-200 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-100">
          <h2 id="payment-form-title" className="text-sm font-semibold text-zinc-900">
            Registrar pago
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-5 space-y-4">
          {/* Contract */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Contrato <span className="text-red-500">*</span>
            </label>
            <select
              ref={firstInputRef}
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              required
              disabled={!!defaultContractId}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">Seleccionar contrato...</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.holder_name ?? 'Sin titular'} — {c.plan_name}
                </option>
              ))}
            </select>
          </div>

          {/* Type + Amount row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as 'deposit' | 'withdrawal' | 'commission')
                }
                required
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Monto (USD) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              />
            </div>
          </div>

          {/* Payment date */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Fecha de pago <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            />
          </div>

          {/* Receipt file */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Comprobante (opcional)
            </label>
            <label className="flex items-center gap-2 w-full rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-500 cursor-pointer hover:border-zinc-400 hover:bg-zinc-100 transition-colors">
              <Upload size={14} className="shrink-0 text-zinc-400" />
              <span className="truncate">
                {receiptFile ? receiptFile.name : 'Seleccionar archivo (PDF / imagen)'}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                className="sr-only"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Observaciones sobre el pago..."
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Registrando...' : 'Registrar pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
