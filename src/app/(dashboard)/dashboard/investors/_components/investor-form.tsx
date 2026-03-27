'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InvestorWithEmail, Investor } from '@/types/investors'

interface InvestorFormProps {
  open: boolean
  onClose: () => void
  /** If provided, puts the form in edit mode */
  investor?: Investor
  /** List of active investors for referrer select */
  activeInvestors: { id: string; full_name: string }[]
}

interface FormValues {
  full_name: string
  cedula: string
  phone: string
  email: string
  referrer_id: string
}

interface FormErrors {
  full_name?: string
  cedula?: string
  email?: string
  server?: string
}

export function InvestorForm({
  open,
  onClose,
  investor,
  activeInvestors,
}: InvestorFormProps) {
  const router = useRouter()
  const isEdit = !!investor
  const dialogRef = useRef<HTMLDialogElement>(null)

  const [values, setValues] = useState<FormValues>({
    full_name: '',
    cedula: '',
    phone: '',
    email: '',
    referrer_id: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  // Populate form on edit mode or reset on open
  useEffect(() => {
    if (open) {
      if (investor) {
        setValues({
          full_name: investor.full_name,
          cedula: investor.cedula,
          phone: investor.phone ?? '',
          email: '',
          referrer_id: investor.referrer_id ?? '',
        })
      } else {
        setValues({ full_name: '', cedula: '', phone: '', email: '', referrer_id: '' })
      }
      setErrors({})
    }
  }, [open, investor])

  // Trap focus / handle Escape
  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    dialog.addEventListener('keydown', onKeyDown)
    return () => dialog.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  function validate(): boolean {
    const next: FormErrors = {}
    if (!values.full_name.trim()) next.full_name = 'El nombre es requerido'
    if (!values.cedula.trim()) next.cedula = 'La cédula es requerida'
    if (!isEdit && !values.email.trim()) next.email = 'El email es requerido'
    if (!isEdit && values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      next.email = 'Email inválido'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setErrors({})

    try {
      const url = isEdit ? `/api/investors/${investor!.id}` : '/api/investors'
      const method = isEdit ? 'PATCH' : 'POST'

      const payload = isEdit
        ? {
            full_name: values.full_name.trim(),
            cedula: values.cedula.trim(),
            phone: values.phone.trim() || null,
            referrer_id: values.referrer_id || null,
          }
        : {
            full_name: values.full_name.trim(),
            cedula: values.cedula.trim(),
            phone: values.phone.trim() || null,
            email: values.email.trim(),
            referrer_id: values.referrer_id || null,
          }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok) {
        setErrors({ server: json.error ?? 'Ocurrió un error' })
        return
      }

      router.refresh()
      onClose()
    } catch {
      setErrors({ server: 'Error de conexión. Intenta nuevamente.' })
    } finally {
      setLoading(false)
    }
  }

  function handleChange(field: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef as unknown as React.RefObject<HTMLDivElement>}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Editar inversionista' : 'Nuevo inversionista'}
        tabIndex={-1}
        className="relative z-10 bg-white rounded-xl shadow-xl border border-zinc-200 w-full max-w-md mx-4 outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-900">
            {isEdit ? 'Editar inversionista' : 'Nuevo inversionista'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-4 sm:px-6 py-5 space-y-4">
            {/* Server error */}
            {errors.server && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {errors.server}
              </div>
            )}

            {/* Nombre completo */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-700" htmlFor="full_name">
                Nombre completo <span className="text-red-500">*</span>
              </label>
              <input
                id="full_name"
                type="text"
                value={values.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                placeholder="Juan Pérez Mora"
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400',
                  'outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-colors',
                  errors.full_name ? 'border-red-400 bg-red-50' : 'border-zinc-300 bg-white'
                )}
              />
              {errors.full_name && (
                <p className="text-xs text-red-600">{errors.full_name}</p>
              )}
            </div>

            {/* Cédula */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-700" htmlFor="cedula">
                Cédula <span className="text-red-500">*</span>
              </label>
              <input
                id="cedula"
                type="text"
                value={values.cedula}
                onChange={(e) => handleChange('cedula', e.target.value)}
                placeholder="1-2345-6789"
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400',
                  'outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-colors',
                  errors.cedula ? 'border-red-400 bg-red-50' : 'border-zinc-300 bg-white'
                )}
              />
              {errors.cedula && (
                <p className="text-xs text-red-600">{errors.cedula}</p>
              )}
            </div>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-700" htmlFor="phone">
                Teléfono
              </label>
              <input
                id="phone"
                type="tel"
                value={values.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+506 8888-8888"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-colors"
              />
            </div>

            {/* Email — solo en creación */}
            {!isEdit && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700" htmlFor="email">
                  Email principal <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={values.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="juan@ejemplo.com"
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400',
                    'outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-colors',
                    errors.email ? 'border-red-400 bg-red-50' : 'border-zinc-300 bg-white'
                  )}
                />
                {errors.email && (
                  <p className="text-xs text-red-600">{errors.email}</p>
                )}
              </div>
            )}

            {/* Referidor */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-700" htmlFor="referrer_id">
                Referido por
              </label>
              <select
                id="referrer_id"
                value={values.referrer_id}
                onChange={(e) => handleChange('referrer_id', e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-colors"
              >
                <option value="">Sin referidor</option>
                {activeInvestors
                  .filter((inv) => !isEdit || inv.id !== investor?.id)
                  .map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.full_name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-50 w-full sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear inversionista'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
