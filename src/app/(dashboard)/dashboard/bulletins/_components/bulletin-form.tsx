'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Plan {
  id: string
  name: string
}

interface BulletinFormProps {
  plans: Plan[]
  defaultValues?: {
    subject?: string
    body?: string
    target_group?: string
    target_plan_id?: string | null
  }
  bulletinId?: string
}

export function BulletinForm({ plans, defaultValues, bulletinId }: BulletinFormProps) {
  const router = useRouter()
  const [subject, setSubject] = useState(defaultValues?.subject ?? '')
  const [body, setBody] = useState(defaultValues?.body ?? '')
  const [targetGroup, setTargetGroup] = useState(
    defaultValues?.target_group ?? 'all_active'
  )
  const [targetPlanId, setTargetPlanId] = useState(
    defaultValues?.target_plan_id ?? ''
  )
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)

    if (!subject.trim()) {
      setError('El asunto es requerido')
      return
    }
    if (!body.trim()) {
      setError('El cuerpo del boletín es requerido')
      return
    }
    if (targetGroup === 'by_plan' && !targetPlanId) {
      setError('Selecciona un plan')
      return
    }

    setSaving(true)

    try {
      const payload = {
        subject: subject.trim(),
        body: body.trim(),
        target_group: targetGroup,
        target_plan_id: targetGroup === 'by_plan' ? targetPlanId : null,
      }

      let id = bulletinId

      if (bulletinId) {
        // PATCH existing
        const res = await fetch(`/api/bulletins/${bulletinId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Error al guardar')
        }
      } else {
        // POST new
        const res = await fetch('/api/bulletins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Error al crear')
        }
        const data = await res.json()
        id = data.id
      }

      router.push(`/dashboard/bulletins/${id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Asunto */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-zinc-700">
          Asunto
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Ej. Actualización de resultados — Enero 2026"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
        />
      </div>

      {/* Grupo objetivo */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-zinc-700">
          Grupo objetivo
        </label>
        <select
          value={targetGroup}
          onChange={(e) => setTargetGroup(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none bg-white"
        >
          <option value="all_active">Todos los activos</option>
          <option value="all_inactive">Todos los inactivos</option>
          <option value="by_plan">Por plan</option>
          <option value="custom">Personalizado</option>
        </select>
      </div>

      {/* Plan selector (solo si by_plan) */}
      {targetGroup === 'by_plan' && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-700">
            Plan
          </label>
          <select
            value={targetPlanId}
            onChange={(e) => setTargetPlanId(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none bg-white"
          >
            <option value="">Seleccionar plan...</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Cuerpo */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-zinc-700">
            Contenido
          </label>
          <button
            type="button"
            onClick={() => setPreview(!preview)}
            className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            {preview ? 'Editar' : 'Vista previa'}
          </button>
        </div>

        {preview ? (
          <div className="min-h-[240px] rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
            {body.trim() ? (
              body.split('\n').map((line, i) =>
                line.trim() ? (
                  <p key={i} className="text-sm text-zinc-700 mb-2 leading-relaxed">
                    {line}
                  </p>
                ) : (
                  <br key={i} />
                )
              )
            ) : (
              <p className="text-sm text-zinc-400">El cuerpo está vacío.</p>
            )}
          </div>
        ) : (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            placeholder="Estimado/a inversionista, nos complace compartir..."
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none resize-y"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors text-center"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center"
        >
          {saving ? 'Guardando...' : 'Guardar borrador'}
        </button>
      </div>
    </div>
  )
}
