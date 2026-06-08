'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, FileText, Edit2, Trash2, Sparkles, Loader2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { ContractTemplateForm } from './contract-template-form'
import type { ContractTemplate } from '@/types/contract-templates'

interface PlanOption {
  id: string
  name: string
  type: 'annual' | 'monthly' | 'semestral'
}

interface ContractTemplatesSectionProps {
  plans: PlanOption[]
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' }).format(new Date(dateStr))
}

export function ContractTemplatesSection({ plans }: ContractTemplatesSectionProps) {
  const toast = useToast()
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ContractTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ContractTemplate | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/contract-templates')
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Error al cargar plantillas')
        return
      }
      setTemplates(data.templates ?? [])
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  async function handleSeedDefaults() {
    setSeeding(true)
    try {
      const res = await fetch('/api/settings/contract-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_defaults' }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Error al generar plantillas por defecto')
        return
      }
      if (data.created === 0) {
        toast.info(data.message ?? 'Todos los planes ya tienen plantilla.')
      } else {
        toast.success(`Se generaron ${data.created} plantillas con el contenido base.`)
      }
      fetchTemplates()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSeeding(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/settings/contract-templates/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Error al eliminar la plantilla')
        return
      }
      toast.success('Plantilla eliminada')
      setDeleteTarget(null)
      fetchTemplates()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setDeleteLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(template: ContractTemplate) {
    setEditing(template)
    setFormOpen(true)
  }

  const noTemplates = !loading && templates.length === 0

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Plantillas de contratos</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Definí múltiples versiones del contrato por plan (ej: Anual normal, Anual promoción).
            Al crear un contrato, elegís cuál plantilla usar.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          {noTemplates && (
            <button
              type="button"
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              {seeding ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Generar plantillas por defecto
            </button>
          )}
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            <Plus size={12} />
            Nueva plantilla
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm py-10 text-center text-sm text-zinc-400">
          <Loader2 size={16} className="animate-spin inline mr-2" />
          Cargando plantillas...
        </div>
      ) : noTemplates ? (
        <div className="bg-white rounded-xl border border-dashed border-zinc-300 py-10 px-6 text-center">
          <FileText size={28} className="mx-auto text-zinc-300 mb-3" />
          <p className="text-sm font-medium text-zinc-700">Sin plantillas todavía</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            Generá las plantillas base con un click (vienen con el contenido de los machotes reales)
            o creá una desde cero.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Nombre
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                    Plan
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                    En uso
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                    Actualizada
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {templates.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      <div className="flex items-center gap-2">
                        <FileText size={13} className="text-zinc-400" />
                        {tpl.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 whitespace-nowrap">
                      {tpl.plan_name}
                    </td>
                    <td className="px-4 py-3">
                      {tpl.active ? (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                          Inactiva
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-700 whitespace-nowrap font-mono text-xs">
                      {tpl.in_use_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                      {formatDate(tpl.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(tpl)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(tpl)}
                          className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ContractTemplateForm
        plans={plans}
        template={editing}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={fetchTemplates}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar plantilla"
        description={
          deleteTarget
            ? `¿Confirmás eliminar "${deleteTarget.name}"? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  )
}
