'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FileText } from 'lucide-react'
import { InvestmentCalculator } from '@/components/investment/investment-calculator'
import { renderTemplate } from '@/lib/contract-templates/render'
import { buildContractVariables } from '@/lib/contract-templates/build-variables'
import { TemplatePreview } from '@/app/(dashboard)/dashboard/settings/_components/template-preview'
import type { PlanType } from '@/lib/investment/calculator'

interface Plan {
  id: string
  name: string
  type: string
  annual_rate: number
  min_amount: number
}

interface Investor {
  id: string
  full_name: string
  cedula: string
  phone?: string | null
}

interface TemplateOption {
  id: string
  name: string
  content: string
  version: number
}

interface NewContractFormProps {
  plans: Plan[]
  investors: Investor[]
}

const REPORT_FREQUENCY_OPTIONS = [
  { value: 1, label: 'Mensual (cada 1 mes)' },
  { value: 2, label: 'Bimestral (cada 2 meses)' },
  { value: 3, label: 'Trimestral (cada 3 meses)' },
  { value: 6, label: 'Semestral (cada 6 meses)' },
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function NewContractForm({ plans, investors }: NewContractFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [planId, setPlanId] = useState('')
  const [investorSearch, setInvestorSearch] = useState('')
  const [investorId, setInvestorId] = useState('')
  const [investorDropdownOpen, setInvestorDropdownOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [termMonths, setTermMonths] = useState('12')
  const [startDate, setStartDate] = useState('')
  const [reportFrequency, setReportFrequency] = useState(2)
  const [notes, setNotes] = useState('')

  // Template state
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [templateId, setTemplateId] = useState('')
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [customizeContent, setCustomizeContent] = useState(false)
  const [customContent, setCustomContent] = useState('')

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === planId) ?? null,
    [plans, planId]
  )

  const filteredInvestors = useMemo(() => {
    const q = investorSearch.trim().toLowerCase()
    if (!q) return investors.slice(0, 10)
    return investors
      .filter(
        (inv) =>
          inv.full_name.toLowerCase().includes(q) ||
          inv.cedula.toLowerCase().includes(q)
      )
      .slice(0, 10)
  }, [investors, investorSearch])

  const selectedInvestor = useMemo(
    () => investors.find((inv) => inv.id === investorId) ?? null,
    [investors, investorId]
  )

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId]
  )

  // Load templates when plan changes
  useEffect(() => {
    if (!planId) {
      setTemplates([])
      setTemplateId('')
      return
    }
    let cancelled = false
    setTemplatesLoading(true)
    fetch(`/api/contracts/templates?plan_id=${planId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const list: TemplateOption[] = data.templates ?? []
        setTemplates(list)
        if (list.length > 0) setTemplateId(list[0].id)
        else setTemplateId('')
      })
      .catch(() => {
        if (!cancelled) setTemplates([])
      })
      .finally(() => {
        if (!cancelled) setTemplatesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [planId])

  // Compute live preview content (template + variables substituted)
  const previewContent = useMemo(() => {
    if (!selectedTemplate || !selectedInvestor || !selectedPlan) return ''
    const amountNum = Number(amount) || 0
    const termMonthsNum = Number(termMonths) || 12
    const variables = buildContractVariables({
      investor: {
        full_name: selectedInvestor.full_name,
        cedula: selectedInvestor.cedula,
        phone: selectedInvestor.phone ?? null,
      },
      contract: {
        amount: amountNum,
        term_months: termMonthsNum,
        start_date: startDate || null,
      },
      plan: {
        name: selectedPlan.name,
        type: selectedPlan.type as 'annual' | 'monthly' | 'semestral',
        annual_rate: selectedPlan.annual_rate,
      },
    })
    return renderTemplate(selectedTemplate.content, variables)
  }, [selectedTemplate, selectedInvestor, selectedPlan, amount, termMonths, startDate])

  // Reset custom content when previewContent changes (unless user is actively editing)
  useEffect(() => {
    if (!customizeContent) {
      setCustomContent(previewContent)
    }
  }, [previewContent, customizeContent])

  const canPreview = selectedTemplate && selectedInvestor && selectedPlan && Number(amount) > 0

  function selectInvestor(inv: Investor) {
    setInvestorId(inv.id)
    setInvestorSearch(inv.full_name)
    setInvestorDropdownOpen(false)
  }

  function handlePlanChange(id: string) {
    setPlanId(id)
    const plan = plans.find((p) => p.id === id)
    if (plan && (!amount || Number(amount) < plan.min_amount)) {
      setAmount(String(plan.min_amount))
    }
    // Reset customization when changing plan
    setCustomizeContent(false)
  }

  function toggleCustomize(checked: boolean) {
    setCustomizeContent(checked)
    if (checked) {
      // Snapshot current preview into the editable textarea
      setCustomContent(previewContent)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!planId) {
      setError('Selecciona un plan')
      return
    }
    if (!investorId) {
      setError('Selecciona un inversionista')
      return
    }
    if (!amount || Number(amount) <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    if (selectedPlan && Number(amount) < selectedPlan.min_amount) {
      setError(
        `El monto mínimo para este plan es ${formatCurrency(selectedPlan.min_amount)}`
      )
      return
    }
    if (!termMonths || Number(termMonths) < 1 || Number(termMonths) > 48) {
      setError('El plazo debe ser entre 1 y 48 meses')
      return
    }

    // Decide what content gets persisted
    const finalContent = customizeContent ? customContent : previewContent

    setSubmitting(true)

    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
          investor_id: investorId,
          amount: Number(amount),
          term_months: Number(termMonths),
          start_date: startDate || null,
          notes: notes.trim() || null,
          report_frequency_months: reportFrequency,
          template_id: templateId || null,
          rendered_content: finalContent || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al crear el contrato')
        return
      }

      router.push(`/dashboard/contracts/${data.contract.id}`)
    } catch {
      setError('Error de red al crear el contrato')
    } finally {
      setSubmitting(false)
    }
  }

  const amountNum = Number(amount) || 0
  const termMonthsNum = Number(termMonths) || 12
  const startDateObj = startDate ? new Date(startDate) : undefined

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_28rem] gap-8 w-full">
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Plan */}
      <div>
        <label htmlFor="contract-plan" className="block text-sm font-medium text-zinc-700 mb-1.5">
          Plan de inversión <span className="text-red-500">*</span>
        </label>
        <select
          id="contract-plan"
          value={planId}
          onChange={(e) => handlePlanChange(e.target.value)}
          required
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-colors"
        >
          <option value="">Selecciona un plan...</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name} — {plan.annual_rate}% anual — Min. {formatCurrency(plan.min_amount)}
            </option>
          ))}
        </select>
        {selectedPlan && (
          <p className="mt-1 text-xs text-zinc-500">
            Monto mínimo: {formatCurrency(selectedPlan.min_amount)} · Tasa: {selectedPlan.annual_rate}% anual
          </p>
        )}
      </div>

      {/* Template selector — solo aparece si hay plantillas disponibles */}
      {planId && (templatesLoading || templates.length > 0) && (
        <div>
          <label htmlFor="contract-template" className="block text-sm font-medium text-zinc-700 mb-1.5">
            Plantilla del contrato
          </label>
          {templatesLoading ? (
            <p className="text-xs text-zinc-400">Cargando plantillas...</p>
          ) : (
            <>
              <select
                id="contract-template"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-colors"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500">
                El texto del contrato se va a generar a partir de esta plantilla.
              </p>
            </>
          )}
        </div>
      )}

      {planId && !templatesLoading && templates.length === 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800">
          <strong>Atención:</strong> Este plan no tiene plantillas activas. Andá a{' '}
          <a href="/dashboard/settings" className="underline font-medium">Configuración</a> y
          creá una plantilla, o usá el botón <em>&ldquo;Generar plantillas por defecto&rdquo;</em>.
        </div>
      )}

      {/* Investor */}
      <div className="relative">
        <label className="block text-sm font-medium text-zinc-700 mb-1.5">
          Inversionista titular <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Buscar por nombre o cédula..."
            value={investorSearch}
            onChange={(e) => {
              setInvestorSearch(e.target.value)
              setInvestorDropdownOpen(true)
              if (!e.target.value) setInvestorId('')
            }}
            onFocus={() => setInvestorDropdownOpen(true)}
            onBlur={() => setTimeout(() => setInvestorDropdownOpen(false), 150)}
            className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-colors"
          />
        </div>
        {investorDropdownOpen && filteredInvestors.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-lg overflow-hidden">
            {filteredInvestors.map((inv) => (
              <button
                key={inv.id}
                type="button"
                onMouseDown={() => selectInvestor(inv)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-zinc-50 transition-colors"
              >
                <span className="font-medium text-zinc-900">{inv.full_name}</span>
                <span className="text-zinc-400 font-mono text-xs">{inv.cedula}</span>
              </button>
            ))}
          </div>
        )}
        {selectedInvestor && (
          <p className="mt-1 text-xs text-zinc-500">
            Cédula: {selectedInvestor.cedula}
          </p>
        )}
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1.5">
          Monto (USD) <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">
            $
          </span>
          <input
            type="number"
            min={selectedPlan?.min_amount ?? 0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="0.00"
            className="w-full rounded-lg border border-zinc-200 bg-white pl-7 pr-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-colors"
          />
        </div>
      </div>

      {/* Term months */}
      <div>
        <label htmlFor="contract-term" className="block text-sm font-medium text-zinc-700 mb-1.5">
          Plazo (meses) <span className="text-red-500">*</span>
        </label>
        <input
          id="contract-term"
          type="number"
          min={1}
          max={48}
          value={termMonths}
          onChange={(e) => setTermMonths(e.target.value)}
          required
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-colors"
        />
        <p className="mt-1 text-xs text-zinc-500">Mínimo 1 mes, máximo 48 meses</p>
      </div>

      {/* Start date */}
      <div>
        <label htmlFor="contract-start-date" className="block text-sm font-medium text-zinc-700 mb-1.5">
          Fecha de inicio
          <span className="ml-1 text-zinc-400 font-normal">(opcional)</span>
        </label>
        <input
          id="contract-start-date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-colors"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Si se deja vacío, se asignará al momento de aprobar el contrato.
        </p>
      </div>

      {/* Report frequency */}
      <div>
        <label htmlFor="contract-report-freq" className="block text-sm font-medium text-zinc-700 mb-1.5">
          Frecuencia de reportes
        </label>
        <select
          id="contract-report-freq"
          value={reportFrequency}
          onChange={(e) => setReportFrequency(Number(e.target.value))}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-colors"
        >
          {REPORT_FREQUENCY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1.5">
          Notas
          <span className="ml-1 text-zinc-400 font-normal">(opcional)</span>
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observaciones o condiciones especiales..."
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 resize-none transition-colors"
        />
      </div>

      {/* Preview + customize */}
      {canPreview && (
        <div className="space-y-3 pt-2 border-t border-zinc-100">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-zinc-500" />
            <h3 className="text-sm font-semibold text-zinc-900">Vista previa del contrato</h3>
          </div>
          <p className="text-xs text-zinc-500">
            Así va a quedar el PDF con los datos del inversionista ya completos.
          </p>

          {customizeContent ? (
            <div className="space-y-2">
              <textarea
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                className="w-full min-h-[400px] max-h-[600px] rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-xs font-mono text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-colors leading-relaxed"
                spellCheck={true}
              />
              <p className="text-xs text-zinc-500">
                Los cambios se aplican <strong>solo a este contrato</strong>. La plantilla
                {selectedTemplate ? ` "${selectedTemplate.name}"` : ''} no se modifica.
              </p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/30 p-1">
              <TemplatePreview
                content={previewContent}
                signatures={[
                  selectedInvestor?.full_name ?? 'Contratante',
                  'April Mora Araya',
                  'José Leoncio Castro Quesada',
                ]}
              />
            </div>
          )}

          <label className="inline-flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
            <input
              type="checkbox"
              checked={customizeContent}
              onChange={(e) => toggleCustomize(e.target.checked)}
              className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
            />
            Necesito ajustar algo en este contrato
          </label>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors w-full sm:w-auto"
        >
          {submitting ? 'Creando...' : 'Crear contrato'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/contracts')}
          className="rounded-lg border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors w-full sm:w-auto"
        >
          Cancelar
        </button>
      </div>
    </form>

    {/* Calculator sidebar */}
    <aside className="lg:sticky lg:top-6 lg:self-start">
      {selectedPlan ? (
        <InvestmentCalculator
          planType={selectedPlan.type as PlanType}
          annualRate={selectedPlan.annual_rate}
          amount={amountNum}
          termMonths={termMonthsNum}
          startDate={startDateObj}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center">
          <p className="text-sm text-zinc-500">
            Seleccioná un plan para ver la proyección de la inversión.
          </p>
        </div>
      )}
    </aside>
    </div>
  )
}
