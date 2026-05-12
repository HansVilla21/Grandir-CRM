'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ConfirmVariant = 'default' | 'danger' | 'success'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
}

const VARIANT_STYLES: Record<ConfirmVariant, { btn: string; icon: string; iconBg: string }> = {
  default: {
    btn: 'bg-zinc-900 hover:bg-zinc-800 text-white',
    icon: 'text-zinc-700',
    iconBg: 'bg-zinc-100',
  },
  danger: {
    btn: 'bg-red-600 hover:bg-red-700 text-white',
    icon: 'text-red-600',
    iconBg: 'bg-red-50',
  },
  success: {
    btn: 'bg-green-600 hover:bg-green-700 text-white',
    icon: 'text-green-600',
    iconBg: 'bg-green-50',
  },
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    dialogRef.current?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, loading, onCancel])

  if (!open) return null

  const styles = VARIANT_STYLES[variant]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => !loading && onCancel()}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-md rounded-xl bg-white p-5 sm:p-6 shadow-xl outline-none"
      >
        <div className="flex items-start gap-3">
          {variant !== 'default' && (
            <div className={cn('shrink-0 rounded-full p-2', styles.iconBg)}>
              <AlertTriangle size={18} className={styles.icon} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
            {description && (
              <p className="mt-1.5 text-sm text-zinc-600 whitespace-pre-wrap">{description}</p>
            )}
          </div>
        </div>

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2',
              styles.btn
            )}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
