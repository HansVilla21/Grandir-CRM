'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PlanSelector, type PlanOption } from './plan-selector'
import { BeneficiaryForm, type BeneficiaryInput } from './beneficiary-form'
import { SuccessScreen } from './success-screen'
import { InvestmentCalculator } from '@/components/investment/investment-calculator'
import { formatCedula, formatCurrency } from '@/lib/investment/format'
import { COUNTRY_CODES } from '@/lib/investment/country-codes'
import { useFormDraft } from './use-form-draft'

interface ApplicationFormProps {
  plans: PlanOption[]
}

interface FormValues {
  plan_id: string | null
  amount: string
  term_months: string
  full_name: string
  cedula: string
  phone_code: string
  phone_number: string
  email: string
  beneficiaries: BeneficiaryInput[]
  accepted: boolean
}

const DEFAULT_VALUES: FormValues = {
  plan_id: null,
  amount: '',
  term_months: '12',
  full_name: '',
  cedula: '',
  phone_code: '+506',
  phone_number: '',
  email: '',
  beneficiaries: [],
  accepted: false,
}

export function ApplicationForm({ plans }: ApplicationFormProps) {
  const [values, setValues] = useState<FormValues>(DEFAULT_VALUES)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const { clearDraft } = useFormDraft(values, setValues)

  const selectedPlan = plans.find((p) => p.id === values.plan_id) ?? null
  const amountNum = Number(values.amount) || 0
  const termMonthsNum = Number(values.term_months) || 12

  function update<K extends keyof FormValues>(key: K, val: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: val }))
  }

  function handlePlanSelect(planId: string) {
    const plan = plans.find((p) => p.id === planId)
    if (!plan) return
    update('plan_id', planId)
    if (!values.amount || Number(values.amount) < plan.min_amount) {
      update('amount', String(plan.min_amount))
    }
  }

  function addBeneficiary() {
    if (values.beneficiaries.length >= 4) return
    update('beneficiaries', [
      ...values.beneficiaries,
      { full_name: '', cedula: '', phone_code: '+506', phone_number: '' },
    ])
  }

  function updateBeneficiary(idx: number, ben: BeneficiaryInput) {
    const next = [...values.beneficiaries]
    next[idx] = ben
    update('beneficiaries', next)
  }

  function removeBeneficiary(idx: number) {
    update(
      'beneficiaries',
      values.beneficiaries.filter((_, i) => i !== idx)
    )
  }

  function validate(): string | null {
    if (!selectedPlan) return 'Selecciona un plan'
    if (amountNum < selectedPlan.min_amount)
      return `El monto mínimo para este plan es ${formatCurrency(selectedPlan.min_amount)}`
    if (!values.full_name.trim()) return 'Ingresa tu nombre completo'
    if (values.cedula.replace(/\D/g, '').length < 9) return 'Ingresa una cédula válida (9 dígitos)'
    if (!values.phone_number.trim()) return 'Ingresa tu número de teléfono'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return 'Ingresa un email válido'
    if (!values.accepted) return 'Debes aceptar el consentimiento'
    return null
  }

  async function handleSubmit() {
    const err = validate()
    if (err) {
      setError(err)
      return
    }

    setLoading(true)
    setError('')

    try {
      const phone = `${values.phone_code} ${values.phone_number.trim()}`
      const beneficiaries = values.beneficiaries
        .filter((b) => b.full_name.trim() && b.cedula.trim())
        .map((b) => ({
          full_name: b.full_name.trim(),
          cedula: b.cedula.trim(),
          phone: `${b.phone_code} ${b.phone_number.trim()}`,
        }))

      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: values.full_name.trim(),
          cedula: values.cedula.trim(),
          phone,
          email: values.email.trim(),
          plan_id: values.plan_id,
          amount: amountNum,
          term_months: termMonthsNum,
          beneficiaries: beneficiaries.length > 0 ? beneficiaries : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message ?? 'Error al enviar la solicitud')
        return
      }

      clearDraft()
      setSubmitted(true)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) return <SuccessScreen />

  const inputClass =
    'w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-colors'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight">
          Solicitá tu inversión
        </h1>
        <p className="mt-3 text-sm sm:text-base text-zinc-600">
          Completá el formulario y nuestro equipo te contactará pronto.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">1. Seleccioná tu plan</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Elegí el plan que mejor se adapte a vos</p>
        </div>
        <PlanSelector plans={plans} selectedId={values.plan_id} onSelect={handlePlanSelect} />
      </section>

      {selectedPlan && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">2. Ingresá tu monto</h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              Mínimo {formatCurrency(selectedPlan.min_amount)} para este plan
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Monto (USD)</label>
                <input
                  type="number"
                  min={selectedPlan.min_amount}
                  value={values.amount}
                  onChange={(e) => update('amount', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Plazo (meses)
                </label>
                <select
                  value={values.term_months}
                  onChange={(e) => update('term_months', e.target.value)}
                  className={inputClass}
                >
                  <option value="12">12 meses</option>
                  <option value="24">24 meses</option>
                  <option value="36">36 meses</option>
                  <option value="48">48 meses</option>
                </select>
              </div>
            </div>

            <InvestmentCalculator
              planType={selectedPlan.type}
              annualRate={selectedPlan.annual_rate}
              amount={amountNum}
              termMonths={termMonthsNum}
            />
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">3. Tus datos personales</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Nombre completo
            </label>
            <input
              type="text"
              value={values.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              placeholder="Nombre y apellidos"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Cédula</label>
            <input
              type="text"
              value={values.cedula}
              onChange={(e) => update('cedula', formatCedula(e.target.value))}
              placeholder="X-XXXX-XXXX"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input
              type="email"
              value={values.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="email@ejemplo.com"
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-1">Teléfono</label>
            <div className="flex gap-2">
              <select
                value={values.phone_code}
                onChange={(e) => update('phone_code', e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-2 py-2.5 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-green-500/20"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.country} value={c.code}>
                    {c.country} {c.code}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={values.phone_number}
                onChange={(e) => update('phone_number', e.target.value.replace(/\D/g, ''))}
                placeholder="88887777"
                className={`${inputClass} flex-1`}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            4. Beneficiarios <span className="text-sm font-normal text-zinc-500">(opcional)</span>
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Podés agregarlos ahora o después. Hasta 4 beneficiarios.
          </p>
        </div>

        {values.beneficiaries.length > 0 && (
          <div className="space-y-3">
            {values.beneficiaries.map((ben, idx) => (
              <BeneficiaryForm
                key={idx}
                index={idx}
                value={ben}
                onChange={(val) => updateBeneficiary(idx, val)}
                onRemove={() => removeBeneficiary(idx)}
              />
            ))}
          </div>
        )}

        {values.beneficiaries.length < 4 && (
          <button
            type="button"
            onClick={addBeneficiary}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <Plus size={16} />
            Agregar beneficiario
          </button>
        )}
      </section>

      <section className="space-y-4 pt-4 border-t border-zinc-200">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={values.accepted}
            onChange={(e) => update('accepted', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-sm text-zinc-700">
            Entiendo que esta es una solicitud y Grandir CM se contactará conmigo para continuar
            el proceso.
          </span>
        </label>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Enviando...' : 'Enviar solicitud'}
        </button>
      </section>
    </div>
  )
}
