'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { X, Search, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Investor } from '@/types/investors'

const COUNTRY_CODES = [
  { code: '+506', country: 'CR', label: 'Costa Rica' },
  { code: '+1', country: 'US', label: 'Estados Unidos' },
  { code: '+52', country: 'MX', label: 'México' },
  { code: '+57', country: 'CO', label: 'Colombia' },
  { code: '+507', country: 'PA', label: 'Panamá' },
  { code: '+503', country: 'SV', label: 'El Salvador' },
  { code: '+502', country: 'GT', label: 'Guatemala' },
  { code: '+504', country: 'HN', label: 'Honduras' },
  { code: '+505', country: 'NI', label: 'Nicaragua' },
  { code: '+34', country: 'ES', label: 'España' },
  { code: '+44', country: 'GB', label: 'Reino Unido' },
  { code: '+55', country: 'BR', label: 'Brasil' },
  { code: '+54', country: 'AR', label: 'Argentina' },
  { code: '+56', country: 'CL', label: 'Chile' },
  { code: '+51', country: 'PE', label: 'Perú' },
  { code: '+593', country: 'EC', label: 'Ecuador' },
]

interface InvestorFormProps {
  open: boolean
  onClose: () => void
  /** If provided, puts the form in edit mode */
  investor?: Investor
  /** Primary email of the investor (only relevant in edit mode) */
  defaultEmail?: string
  /** List of active investors for referrer select */
  activeInvestors: { id: string; full_name: string }[]
}

interface FormValues {
  full_name: string
  cedula: string
  phone_code: string
  phone_number: string
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
  defaultEmail,
  activeInvestors,
}: InvestorFormProps) {
  const router = useRouter()
  const isEdit = !!investor
  const dialogRef = useRef<HTMLDialogElement>(null)

  const [values, setValues] = useState<FormValues>({
    full_name: '',
    cedula: '',
    phone_code: '+506',
    phone_number: '',
    email: '',
    referrer_id: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [referrerSearch, setReferrerSearch] = useState('')
  const [referrerOpen, setReferrerOpen] = useState(false)
  const referrerRef = useRef<HTMLDivElement>(null)

  // Auto-format cédula: X-XXXX-XXXX
  function formatCedula(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 9)
    if (digits.length <= 1) return digits
    if (digits.length <= 5) return `${digits[0]}-${digits.slice(1)}`
    return `${digits[0]}-${digits.slice(1, 5)}-${digits.slice(5)}`
  }

  // Parse existing phone into code + number on edit
  function parsePhone(phone: string | null): { code: string; number: string } {
    if (!phone) return { code: '+506', number: '' }
    const match = phone.match(/^(\+\d{1,3})\s*(.*)$/)
    if (match) {
      const foundCode = COUNTRY_CODES.find((c) => c.code === match[1])
      if (foundCode) return { code: foundCode.code, number: match[2] }
    }
    return { code: '+506', number: phone }
  }

  // Populate form on edit mode or reset on open
  useEffect(() => {
    if (open) {
      if (investor) {
        const parsed = parsePhone(investor.phone)
        setValues({
          full_name: investor.full_name,
          cedula: formatCedula(investor.cedula),
          phone_code: parsed.code,
          phone_number: parsed.number,
          email: defaultEmail ?? '',
          referrer_id: investor.referrer_id ?? '',
        })
      } else {
        setValues({ full_name: '', cedula: '', phone_code: '+506', phone_number: '', email: '', referrer_id: '' })
      }
      setErrors({})
      setReferrerSearch('')
      setReferrerOpen(false)
    }
  }, [open, investor, defaultEmail])

  // Close referrer dropdown on outside click
  useEffect(() => {
    if (!referrerOpen) return
    function handleClick(e: MouseEvent) {
      if (referrerRef.current && !referrerRef.current.contains(e.target as Node)) {
        setReferrerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [referrerOpen])

  const filteredInvestors = useMemo(() => {
    const list = activeInvestors.filter((inv) => !isEdit || inv.id !== investor?.id)
    if (!referrerSearch.trim()) return list
    const q = referrerSearch.trim().toLowerCase()
    return list.filter((inv) => inv.full_name.toLowerCase().includes(q))
  }, [activeInvestors, referrerSearch, isEdit, investor])

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
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
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

      const phone = values.phone_number.trim()
        ? `${values.phone_code} ${values.phone_number.trim()}`
        : null

      const payload = isEdit
        ? {
            full_name: values.full_name.trim(),
            cedula: values.cedula.trim(),
            phone,
            email: values.email.trim() || null,
            referrer_id: values.referrer_id || null,
          }
        : {
            full_name: values.full_name.trim(),
            cedula: values.cedula.trim(),
            phone,
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
                onChange={(e) => handleChange('cedula', formatCedula(e.target.value))}
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

            {/* Teléfono con código de país */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-700" htmlFor="phone_number">
                Teléfono
              </label>
              <div className="flex gap-2">
                <select
                  aria-label="Código de país"
                  value={values.phone_code}
                  onChange={(e) => handleChange('phone_code', e.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-colors shrink-0 w-[120px]"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.country} {c.code}
                    </option>
                  ))}
                </select>
                <input
                  id="phone_number"
                  type="tel"
                  value={values.phone_number}
                  onChange={(e) => handleChange('phone_number', e.target.value)}
                  placeholder="8888-8888"
                  className="flex-1 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-colors"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-700" htmlFor="email">
                Email principal {!isEdit && <span className="text-red-500">*</span>}
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

            {/* Referidor — combobox con búsqueda */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-zinc-700">
                Referido por
              </label>
              <div ref={referrerRef} className="relative">
                <button
                  type="button"
                  onClick={() => { setReferrerOpen(!referrerOpen); setReferrerSearch('') }}
                  className="w-full flex items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-left outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-colors"
                >
                  <span className={values.referrer_id ? 'text-zinc-900' : 'text-zinc-400'}>
                    {values.referrer_id
                      ? activeInvestors.find((i) => i.id === values.referrer_id)?.full_name ?? 'Seleccionar'
                      : 'Sin referidor'}
                  </span>
                  <ChevronDown size={14} className="text-zinc-400 shrink-0" />
                </button>

                {referrerOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white rounded-lg border border-zinc-200 shadow-lg overflow-hidden">
                    {/* Search input */}
                    <div className="p-2 border-b border-zinc-100">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        <input
                          type="text"
                          value={referrerSearch}
                          onChange={(e) => setReferrerSearch(e.target.value)}
                          placeholder="Buscar inversionista..."
                          autoFocus
                          className="w-full rounded-md border border-zinc-200 bg-zinc-50 pl-8 pr-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400"
                        />
                      </div>
                    </div>

                    {/* Options */}
                    <div className="max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => { handleChange('referrer_id', ''); setReferrerOpen(false) }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-zinc-50 transition-colors',
                          !values.referrer_id ? 'text-zinc-900 font-medium' : 'text-zinc-500'
                        )}
                      >
                        {!values.referrer_id && <Check size={14} className="text-zinc-900 shrink-0" />}
                        <span className={!values.referrer_id ? '' : 'pl-[22px]'}>Sin referidor</span>
                      </button>
                      {filteredInvestors.map((inv) => (
                        <button
                          type="button"
                          key={inv.id}
                          onClick={() => { handleChange('referrer_id', inv.id); setReferrerOpen(false) }}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-zinc-50 transition-colors',
                            values.referrer_id === inv.id ? 'text-zinc-900 font-medium' : 'text-zinc-700'
                          )}
                        >
                          {values.referrer_id === inv.id && <Check size={14} className="text-zinc-900 shrink-0" />}
                          <span className={values.referrer_id === inv.id ? '' : 'pl-[22px]'}>{inv.full_name}</span>
                        </button>
                      ))}
                      {filteredInvestors.length === 0 && referrerSearch.trim() && (
                        <p className="px-3 py-3 text-sm text-zinc-400 text-center">No se encontraron resultados</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
