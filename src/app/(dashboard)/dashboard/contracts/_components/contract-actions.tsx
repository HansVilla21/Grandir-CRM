'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ContractStatus } from '@/types/contracts'

interface ContractActionsProps {
  contractId: string
  currentStatus: ContractStatus
  userRole: string
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  confirmClassName: string
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmClassName,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      dialogRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
      />
      {/* Panel */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-md rounded-xl bg-white p-4 sm:p-6 shadow-xl outline-none mx-4 sm:mx-0"
      >
        <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
        <p className="mt-1.5 text-sm text-zinc-600">{description}</p>
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={confirmClassName}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function CopyPortalLinkButton({ contractId }: { contractId: string }) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  async function fetchAndCopy() {
    setLoading(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}`)
      const data = await res.json()
      const investors = data?.contract?.contract_investors ?? []
      const holders = investors.filter(
        (ci: { portal_token: string | null }) => ci.portal_token
      )
      if (holders?.[0]?.portal_token) {
        const url = `${window.location.origin}/portal/${holders[0].portal_token}`
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={fetchAndCopy}
      disabled={loading}
      className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
    >
      {copied ? '¡Link copiado!' : loading ? 'Cargando...' : 'Copiar link del portal'}
    </button>
  )
}

export function ContractActions({
  contractId,
  currentStatus,
  userRole,
}: ContractActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    targetStatus: ContractStatus | null
    title: string
    description: string
    confirmLabel: string
    confirmClassName: string
  }>({
    open: false,
    targetStatus: null,
    title: '',
    description: '',
    confirmLabel: '',
    confirmClassName: '',
  })
  const [revisionComment, setRevisionComment] = useState('')

  const isAdmin = userRole === 'admin'

  async function transitionTo(newStatus: ContractStatus, comment?: string) {
    setLoading(true)
    setError(null)

    try {
      const body: Record<string, unknown> = { status: newStatus }
      if (comment) body.revision_comment = comment

      const res = await fetch(`/api/contracts/${contractId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al actualizar el contrato')
        return
      }

      router.refresh()
    } catch {
      setError('Error de red al actualizar el contrato')
    } finally {
      setLoading(false)
    }
  }

  function openConfirm(
    targetStatus: ContractStatus,
    title: string,
    description: string,
    confirmLabel: string,
    confirmClassName: string
  ) {
    setConfirmDialog({
      open: true,
      targetStatus,
      title,
      description,
      confirmLabel,
      confirmClassName,
    })
  }

  function closeConfirm() {
    setConfirmDialog((prev) => ({ ...prev, open: false, targetStatus: null }))
    setRevisionComment('')
  }

  async function handleConfirm() {
    if (!confirmDialog.targetStatus) return
    await transitionTo(confirmDialog.targetStatus, revisionComment || undefined)
    closeConfirm()
  }

  if (
    currentStatus === 'expired' ||
    currentStatus === 'cancelled'
  ) {
    return null
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {error && (
          <p className="w-full text-sm text-red-600">{error}</p>
        )}

        {/* draft */}
        {currentStatus === 'draft' && (
          <button
            type="button"
            disabled={loading}
            onClick={() => transitionTo('pending_approval')}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Enviando...' : 'Enviar a aprobación'}
          </button>
        )}

        {/* pending_approval */}
        {currentStatus === 'pending_approval' && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                openConfirm(
                  'active',
                  'Aprobar contrato',
                  'Esta acción activará el contrato. El inversionista podrá acceder al portal.',
                  'Aprobar',
                  'rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors'
                )
              }
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Aprobar
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                openConfirm(
                  'revision_requested',
                  'Solicitar revisión',
                  'El contrato volverá al equipo para correcciones.',
                  'Solicitar revisión',
                  'rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50 transition-colors'
                )
              }
              className="rounded-lg border border-yellow-500 px-4 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-50 disabled:opacity-50 transition-colors"
            >
              Solicitar revisión
            </button>
            <CopyPortalLinkButton contractId={contractId} />
          </>
        )}

        {/* revision_requested */}
        {currentStatus === 'revision_requested' && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => transitionTo('draft')}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Guardando...' : 'Volver a borrador'}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                openConfirm(
                  'cancelled',
                  'Cancelar contrato',
                  'Esta acción cancelará el contrato definitivamente. No se puede deshacer.',
                  'Cancelar contrato',
                  'rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors'
                )
              }
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
          </>
        )}

        {/* active — solo admin */}
        {currentStatus === 'active' && isAdmin && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                openConfirm(
                  'expired',
                  'Marcar como vencido',
                  'El contrato quedará marcado como vencido.',
                  'Marcar vencido',
                  'rounded-lg bg-zinc-600 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors'
                )
              }
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
            >
              Marcar vencido
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                openConfirm(
                  'cancelled',
                  'Cancelar contrato activo',
                  'Cancelar un contrato activo es una acción irreversible. Asegúrate de haber documentado el motivo.',
                  'Cancelar contrato',
                  'rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors'
                )
              }
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              Cancelar contrato
            </button>
          </>
        )}
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        confirmClassName={confirmDialog.confirmClassName}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      >
        {/* Revision comment input */}
        {confirmDialog.targetStatus === 'revision_requested' && (
          <div>
            <label
              htmlFor="revision-comment"
              className="block text-sm font-medium text-zinc-700 mb-1"
            >
              Comentario (opcional)
            </label>
            <textarea
              id="revision-comment"
              rows={3}
              value={revisionComment}
              onChange={(e) => setRevisionComment(e.target.value)}
              placeholder="Describe qué debe corregirse..."
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 resize-none transition-colors"
            />
          </div>
        )}
      </ConfirmDialog>
    </>
  )
}
