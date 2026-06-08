'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Loader2, Eye, Code2, Variable } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { AVAILABLE_VARIABLES } from '@/types/contract-templates'
import { renderTemplate, getSampleVariables } from '@/lib/contract-templates/render'
import { TemplatePreview } from './template-preview'
import type { ContractTemplate } from '@/types/contract-templates'

interface PlanOption {
  id: string
  name: string
  type: 'annual' | 'monthly' | 'semestral'
}

interface ContractTemplateFormProps {
  plans: PlanOption[]
  template?: ContractTemplate | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ContractTemplateForm({
  plans,
  template,
  open,
  onClose,
  onSuccess,
}: ContractTemplateFormProps) {
  const toast = useToast()
  const isEdit = !!template
  const [planId, setPlanId] = useState('')
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [active, setActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'editor' | 'preview'>('editor')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      if (template) {
        setPlanId(template.plan_id)
        setName(template.name)
        setContent(template.content)
        setActive(template.active)
      } else {
        setPlanId(plans[0]?.id ?? '')
        setName('')
        setContent('')
        setActive(true)
      }
      setView('editor')
      setError(null)
    }
  }, [open, template, plans])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, loading, onClose])

  function insertVariable(varKey: string) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const text = `{{${varKey}}}`
    const newContent = content.slice(0, start) + text + content.slice(end)
    setContent(newContent)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + text.length
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!planId) {
      setError('Selecciona un plan')
      return
    }
    if (!name.trim()) {
      setError('Asigna un nombre a la plantilla')
      return
    }
    if (!content.trim()) {
      setError('El contenido no puede estar vacío')
      return
    }

    setLoading(true)
    try {
      const url = isEdit
        ? `/api/settings/contract-templates/${template!.id}`
        : '/api/settings/contract-templates'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
          name: name.trim(),
          content,
          active,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al guardar la plantilla')
        return
      }

      toast.success(isEdit ? 'Plantilla actualizada' : 'Plantilla creada')
      onSuccess()
      onClose()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const selectedPlan = plans.find((p) => p.id === planId)
  const sampleVars = getSampleVariables(selectedPlan?.name ?? 'Plan')
  const rendered = renderTemplate(content, sampleVars)

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-6xl bg-white rounded-xl border border-zinc-200 shadow-xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-100 shrink-0">
          <h2 className="text-sm font-semibold text-zinc-900">
            {isEdit ? 'Editar plantilla' : 'Nueva plantilla de contrato'}
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-100 rounded-md p-0.5">
              <button
                type="button"
                onClick={() => setView('editor')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  view === 'editor'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <Code2 size={12} />
                Editor
              </button>
              <button
                type="button"
                onClick={() => setView('preview')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  view === 'preview'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <Eye size={12} />
                Preview
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-50"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Metadata row */}
          <div className="px-4 sm:px-6 py-3 border-b border-zinc-100 grid grid-cols-1 sm:grid-cols-12 gap-3 shrink-0">
            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Plan <span className="text-red-500">*</span>
              </label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              >
                <option value="">Seleccionar plan...</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-6">
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Plan Anual — Plantilla base"
                required
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              />
            </div>
            <div className="sm:col-span-2 flex items-end">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                Activa
              </label>
            </div>
          </div>

          {/* Editor or preview */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
            {view === 'editor' ? (
              <>
                <div className="flex-1 flex flex-col p-4 sm:p-5 overflow-hidden">
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Contenido (texto + variables tipo <code className="px-1 py-0.5 bg-zinc-100 rounded text-[10px]">{'{{var}}'}</code>)
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="# CONTRATO DE INVERSIÓN&#10;&#10;Entre {{investor_name}} y..."
                    required
                    className="flex-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-mono text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-none leading-relaxed"
                    spellCheck={false}
                  />
                  <p className="mt-2 text-[11px] text-zinc-400 leading-relaxed">
                    Formato: <code className="px-1 bg-zinc-100 rounded">#</code> título principal,{' '}
                    <code className="px-1 bg-zinc-100 rounded">##</code> sección,{' '}
                    <code className="px-1 bg-zinc-100 rounded">-</code> bullet,{' '}
                    <code className="px-1 bg-zinc-100 rounded">**texto**</code> negrita.
                  </p>
                </div>
                <div className="lg:w-72 border-t lg:border-t-0 lg:border-l border-zinc-100 bg-zinc-50/50 overflow-y-auto">
                  <div className="px-4 py-3 border-b border-zinc-100 sticky top-0 bg-zinc-50/95 backdrop-blur-sm">
                    <div className="flex items-center gap-1.5">
                      <Variable size={12} className="text-zinc-500" />
                      <h3 className="text-xs font-semibold text-zinc-700">Variables</h3>
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-500">
                      Click para insertar en la posición del cursor.
                    </p>
                  </div>
                  <div className="px-2 py-2 space-y-0.5">
                    {AVAILABLE_VARIABLES.map((v) => (
                      <button
                        type="button"
                        key={v.key}
                        onClick={() => insertVariable(v.key)}
                        className="w-full text-left px-2 py-1.5 rounded text-[11px] hover:bg-white transition-colors group"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <code className="font-mono text-zinc-900 font-medium">
                            {`{{${v.key}}}`}
                          </code>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">
                          {v.label}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
                <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800">
                  Preview con datos de muestra. Las variables se sustituyen al generar el PDF real.
                </div>
                <TemplatePreview content={rendered} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 border-t border-zinc-100 shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
            {error ? (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 flex-1">
                {error}
              </p>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse sm:flex-row gap-2">
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
                {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear plantilla'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
