# External Application Form + Investment Calculator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar formulario público de solicitud con calculadora dinámica de rendimiento, que crea inversionista + contrato borrador al enviar.

**Architecture:** Componentes reutilizables: (1) lógica pura de cálculo en `src/lib/investment/`, (2) componente UI de calculadora, (3) página pública en `/solicitud`. API pública `POST /api/applications` con rate limiting. Campo `source` en contracts para métricas de conversión.

**Tech Stack:** Next.js 16 (App Router), Supabase, TypeScript, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-04-05-external-application-form-design.md`

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260405120000_contract_source.sql` | Agregar columna `source` a contracts |
| `src/lib/investment/calculator.ts` | Funciones puras de cálculo de rendimiento |
| `src/lib/investment/country-codes.ts` | Códigos de país extraídos (reutilizable) |
| `src/lib/investment/format.ts` | Helpers compartidos (formatCedula, etc) |
| `src/components/investment/investment-calculator.tsx` | Componente UI de calculadora |
| `src/app/(portal)/solicitud/page.tsx` | Server component página pública |
| `src/app/(portal)/solicitud/_components/application-form.tsx` | Formulario completo client component |
| `src/app/(portal)/solicitud/_components/plan-selector.tsx` | Cards de planes |
| `src/app/(portal)/solicitud/_components/beneficiary-form.tsx` | Sub-form de beneficiarios |
| `src/app/(portal)/solicitud/_components/use-form-draft.ts` | Hook localStorage |
| `src/app/(portal)/solicitud/_components/success-screen.tsx` | Pantalla de éxito |
| `src/app/api/applications/route.ts` | POST /api/applications |
| `src/app/api/applications/plans/route.ts` | GET /api/applications/plans |
| `src/lib/email/new-application-email.ts` | Email al admin |

### Modified files
| File | Change |
|------|--------|
| `src/types/database.ts` | Agregar `source` a contracts Row/Insert/Update |
| `src/types/contracts.ts` | Agregar tipo `ContractSource` |

---

## Task 1: Database Migration — source field

**Files:**
- Create: `supabase/migrations/20260405120000_contract_source.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- Crear enum para el origen del contrato
CREATE TYPE contract_source AS ENUM ('external_form', 'manual');

-- Agregar columna source a contracts
ALTER TABLE contracts
  ADD COLUMN source contract_source NOT NULL DEFAULT 'manual';

-- Los contratos existentes quedan como 'manual' (default)
-- Índice para filtrar por origen en el dashboard
CREATE INDEX idx_contracts_source ON contracts(source);
```

- [ ] **Step 2: Apply via Supabase MCP**

Run: `mcp__supabase__apply_migration` with name `contract_source` and the SQL above.

- [ ] **Step 3: Verify**

Run: `mcp__supabase__execute_sql` with query `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'source';`

Expected: returns 1 row with `source` / `USER-DEFINED`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260405120000_contract_source.sql
git commit -m "feat: migración campo source en contracts para origen de solicitud"
```

---

## Task 2: TypeScript Types — source field

**Files:**
- Modify: `src/types/database.ts`
- Modify: `src/types/contracts.ts`

- [ ] **Step 1: Update database.ts**

In `src/types/database.ts`, find the `contracts` Row type. Add after `notes`:
```typescript
source: Database['public']['Enums']['contract_source']
```

Add the same to Insert type as optional:
```typescript
source?: Database['public']['Enums']['contract_source']
```

Add the same to Update type as optional:
```typescript
source?: Database['public']['Enums']['contract_source']
```

Find the `Enums` section of the Database type and add:
```typescript
contract_source: "external_form" | "manual"
```

- [ ] **Step 2: Update contracts.ts**

In `src/types/contracts.ts`, add after `ContractStatus`:
```typescript
export type ContractSource = 'external_form' | 'manual'
```

Also add `source: ContractSource` to the `ContractListItem` and `ContractDetail` interfaces.

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -10
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/database.ts src/types/contracts.ts
git commit -m "feat: types para campo source en contracts"
```

---

## Task 3: Shared Utilities (extracted from investor-form)

**Files:**
- Create: `src/lib/investment/country-codes.ts`
- Create: `src/lib/investment/format.ts`

- [ ] **Step 1: Create country-codes.ts**

Create `src/lib/investment/country-codes.ts`:

```typescript
export interface CountryCode {
  code: string
  country: string
  label: string
}

export const COUNTRY_CODES: CountryCode[] = [
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
```

- [ ] **Step 2: Create format.ts**

Create `src/lib/investment/format.ts`:

```typescript
/** Auto-format cédula as X-XXXX-XXXX (formato Costa Rica, max 9 dígitos) */
export function formatCedula(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 1) return digits
  if (digits.length <= 5) return `${digits[0]}-${digits.slice(1)}`
  return `${digits[0]}-${digits.slice(1, 5)}-${digits.slice(5)}`
}

/** Strip all non-digits from cedula */
export function normalizeCedula(raw: string): string {
  return raw.replace(/\D/g, '')
}

/** Format amount as USD currency */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

/** Format date as Costa Rican long date */
export function formatLongDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-CR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/investment/country-codes.ts src/lib/investment/format.ts
git commit -m "feat: utilidades compartidas (country codes, cedula format, currency)"
```

---

## Task 4: Investment Calculator (pure logic)

**Files:**
- Create: `src/lib/investment/calculator.ts`

- [ ] **Step 1: Create calculator.ts**

Create `src/lib/investment/calculator.ts`:

```typescript
export type PlanType = 'annual' | 'monthly' | 'semestral'

export interface CalculatorInput {
  planType: PlanType
  annualRate: number // percentage, e.g., 120 means 120%
  amount: number
  termMonths: number
  startDate?: Date
}

export interface ScheduleItem {
  date: Date
  type: 'return' | 'final_payout'
  amount: number
  description: string
}

export interface CalculatorResult {
  capital: number
  totalReturn: number // profit in $
  totalPayout: number // capital + profit
  endDate: Date
  schedule: ScheduleItem[]
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

/**
 * Calcula el rendimiento y cronograma de una inversión según el plan.
 *
 * Lógica basada en requerimientos del cliente (sección 4.2):
 * - Anual (120%): pago único al final. Return = capital * 0.20
 * - Mensual (125%): 10% del capital mensual desde mes 3. Resto al final.
 * - Semestral (135%): desembolsos semestrales del 40% del capital. Resto al final.
 */
export function calculateInvestment(input: CalculatorInput): CalculatorResult {
  const { planType, annualRate, amount, termMonths } = input
  const startDate = input.startDate ?? new Date()
  const endDate = addMonths(startDate, termMonths)

  // El rendimiento total es el % sobre el capital. Ej: 120% = 0.20 de rendimiento real
  const profitPercentage = (annualRate - 100) / 100
  const totalReturn = amount * profitPercentage
  const totalPayout = amount + totalReturn

  const schedule: ScheduleItem[] = []

  if (planType === 'annual') {
    // Pago único al vencimiento
    schedule.push({
      date: endDate,
      type: 'final_payout',
      amount: totalPayout,
      description: 'Pago único al vencimiento (capital + rendimiento)',
    })
  } else if (planType === 'monthly') {
    // 10% del capital cada mes desde el mes 3
    const monthlyReturn = amount * 0.1
    let paidReturn = 0

    for (let month = 3; month <= termMonths; month++) {
      schedule.push({
        date: addMonths(startDate, month),
        type: 'return',
        amount: monthlyReturn,
        description: `Pago mensual (10% del capital) — mes ${month}`,
      })
      paidReturn += monthlyReturn
    }

    // Al final se entrega el capital + rendimiento restante
    const finalAmount = amount + (totalReturn - paidReturn)
    schedule.push({
      date: endDate,
      type: 'final_payout',
      amount: finalAmount,
      description: 'Capital + rendimiento restante al vencimiento',
    })
  } else if (planType === 'semestral') {
    // 40% del capital cada 6 meses
    const semestralReturn = amount * 0.4
    let paidReturn = 0

    for (let month = 6; month <= termMonths; month += 6) {
      schedule.push({
        date: addMonths(startDate, month),
        type: 'return',
        amount: semestralReturn,
        description: `Pago semestral (40% del capital) — mes ${month}`,
      })
      paidReturn += semestralReturn
    }

    // Al final se entrega el capital + rendimiento restante
    const finalAmount = amount + (totalReturn - paidReturn)
    // Si el último pago semestral coincide con el final, ajustar
    const lastItem = schedule[schedule.length - 1]
    if (lastItem && lastItem.date.getTime() === endDate.getTime()) {
      lastItem.amount += finalAmount - semestralReturn
      lastItem.type = 'final_payout'
      lastItem.description = 'Pago semestral final + capital'
    } else {
      schedule.push({
        date: endDate,
        type: 'final_payout',
        amount: finalAmount,
        description: 'Capital + rendimiento restante al vencimiento',
      })
    }
  }

  return {
    capital: amount,
    totalReturn,
    totalPayout,
    endDate,
    schedule,
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/investment/calculator.ts
git commit -m "feat: lógica pura de calculadora de inversión según planes del cliente"
```

---

## Task 5: Investment Calculator UI Component

**Files:**
- Create: `src/components/investment/investment-calculator.tsx`

- [ ] **Step 1: Create component**

Create `src/components/investment/investment-calculator.tsx`:

```tsx
'use client'

import { useMemo } from 'react'
import { calculateInvestment, type PlanType } from '@/lib/investment/calculator'
import { formatCurrency, formatLongDate } from '@/lib/investment/format'

interface InvestmentCalculatorProps {
  planType: PlanType
  annualRate: number
  amount: number
  termMonths: number
  startDate?: Date
}

export function InvestmentCalculator({
  planType,
  annualRate,
  amount,
  termMonths,
  startDate,
}: InvestmentCalculatorProps) {
  const result = useMemo(
    () => calculateInvestment({ planType, annualRate, amount, termMonths, startDate }),
    [planType, annualRate, amount, termMonths, startDate]
  )

  if (amount <= 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center">
        <p className="text-sm text-zinc-500">Ingresa un monto para ver tu proyección</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 space-y-5">
      <h3 className="text-sm font-semibold text-zinc-900">Proyección de tu inversión</h3>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg bg-zinc-50 p-3">
          <p className="text-xs text-zinc-500 mb-0.5">Capital invertido</p>
          <p className="text-base font-semibold text-zinc-900">{formatCurrency(result.capital)}</p>
        </div>
        <div className="rounded-lg bg-green-50 p-3 border border-green-100">
          <p className="text-xs text-green-700 mb-0.5">Rendimiento</p>
          <p className="text-base font-semibold text-green-800">+{formatCurrency(result.totalReturn)}</p>
        </div>
        <div className="rounded-lg bg-zinc-900 p-3">
          <p className="text-xs text-zinc-400 mb-0.5">Total a recibir</p>
          <p className="text-base font-semibold text-white">{formatCurrency(result.totalPayout)}</p>
        </div>
      </div>

      {/* End date */}
      <div className="flex items-center justify-between py-2 border-y border-zinc-100">
        <span className="text-sm text-zinc-600">Fecha de vencimiento</span>
        <span className="text-sm font-medium text-zinc-900">{formatLongDate(result.endDate)}</span>
      </div>

      {/* Schedule */}
      <div>
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
          Cronograma de pagos
        </h4>
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {result.schedule.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-zinc-50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-zinc-500">{formatLongDate(item.date)}</p>
                <p className="text-xs text-zinc-700 truncate">{item.description}</p>
              </div>
              <span
                className={`shrink-0 text-sm font-semibold ${
                  item.type === 'final_payout' ? 'text-zinc-900' : 'text-green-700'
                }`}
              >
                {formatCurrency(item.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -5
```

- [ ] **Step 3: Commit**

```bash
git add src/components/investment/investment-calculator.tsx
git commit -m "feat: componente UI de calculadora de inversión"
```

---

## Task 6: Plan Selector Component

**Files:**
- Create: `src/app/(portal)/solicitud/_components/plan-selector.tsx`

- [ ] **Step 1: Create component**

Create `src/app/(portal)/solicitud/_components/plan-selector.tsx`:

```tsx
'use client'

import { Check } from 'lucide-react'
import { formatCurrency } from '@/lib/investment/format'

export interface PlanOption {
  id: string
  name: string
  type: 'annual' | 'monthly' | 'semestral'
  annual_rate: number
  min_amount: number
  description: string | null
}

interface PlanSelectorProps {
  plans: PlanOption[]
  selectedId: string | null
  onSelect: (planId: string) => void
}

const TYPE_LABELS: Record<string, string> = {
  annual: 'Anual',
  monthly: 'Mensual',
  semestral: 'Semestral',
}

export function PlanSelector({ plans, selectedId, onSelect }: PlanSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {plans.map((plan) => {
        const isSelected = selectedId === plan.id
        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelect(plan.id)}
            className={`relative text-left rounded-xl border-2 p-5 transition-all ${
              isSelected
                ? 'border-green-500 bg-green-50 shadow-sm'
                : 'border-zinc-200 bg-white hover:border-zinc-300'
            }`}
          >
            {isSelected && (
              <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                <Check size={14} className="text-white" />
              </div>
            )}

            <div className="mb-3">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Plan {TYPE_LABELS[plan.type] ?? plan.type}
              </p>
              <h3 className="text-lg font-semibold text-zinc-900 mt-0.5">{plan.name}</h3>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-zinc-500">Rendimiento</span>
                <span className="text-xl font-bold text-green-700">{plan.annual_rate}%</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-zinc-500">Monto mínimo</span>
                <span className="text-sm font-semibold text-zinc-900">
                  {formatCurrency(plan.min_amount)}
                </span>
              </div>
            </div>

            {plan.description && (
              <p className="text-xs text-zinc-600 leading-relaxed pt-3 border-t border-zinc-100">
                {plan.description}
              </p>
            )}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(portal)/solicitud/_components/plan-selector.tsx"
git commit -m "feat: componente selector de planes con cards"
```

---

## Task 7: Beneficiary Form Component

**Files:**
- Create: `src/app/(portal)/solicitud/_components/beneficiary-form.tsx`

- [ ] **Step 1: Create component**

Create `src/app/(portal)/solicitud/_components/beneficiary-form.tsx`:

```tsx
'use client'

import { X } from 'lucide-react'
import { formatCedula } from '@/lib/investment/format'
import { COUNTRY_CODES } from '@/lib/investment/country-codes'

export interface BeneficiaryInput {
  full_name: string
  cedula: string
  phone_code: string
  phone_number: string
}

interface BeneficiaryFormProps {
  index: number
  value: BeneficiaryInput
  onChange: (value: BeneficiaryInput) => void
  onRemove: () => void
}

export function BeneficiaryForm({ index, value, onChange, onRemove }: BeneficiaryFormProps) {
  function update<K extends keyof BeneficiaryInput>(field: K, val: BeneficiaryInput[K]) {
    onChange({ ...value, [field]: val })
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-colors'

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-900">Beneficiario {index + 1}</h4>
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center justify-center h-7 w-7 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          aria-label="Eliminar beneficiario"
        >
          <X size={16} />
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre completo</label>
        <input
          type="text"
          value={value.full_name}
          onChange={(e) => update('full_name', e.target.value)}
          placeholder="Nombre del beneficiario"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Cédula</label>
        <input
          type="text"
          value={value.cedula}
          onChange={(e) => update('cedula', formatCedula(e.target.value))}
          placeholder="X-XXXX-XXXX"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Teléfono</label>
        <div className="flex gap-2">
          <select
            value={value.phone_code}
            onChange={(e) => update('phone_code', e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-green-500/20"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.country} value={c.code}>
                {c.country} {c.code}
              </option>
            ))}
          </select>
          <input
            type="tel"
            value={value.phone_number}
            onChange={(e) => update('phone_number', e.target.value.replace(/\D/g, ''))}
            placeholder="88887777"
            className={`${inputClass} flex-1`}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(portal)/solicitud/_components/beneficiary-form.tsx"
git commit -m "feat: sub-formulario de beneficiarios"
```

---

## Task 8: Form Draft Hook (localStorage)

**Files:**
- Create: `src/app/(portal)/solicitud/_components/use-form-draft.ts`

- [ ] **Step 1: Create hook**

Create `src/app/(portal)/solicitud/_components/use-form-draft.ts`:

```typescript
'use client'

import { useEffect, useRef } from 'react'

const STORAGE_KEY = 'grandir_application_draft'
const DEBOUNCE_MS = 500

export function useFormDraft<T>(
  values: T,
  setValues: (values: T) => void
) {
  const hasLoadedRef = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load draft on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setValues(parsed)
      }
    } catch {
      // ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save draft on changes (debounced)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!hasLoadedRef.current) return

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(values))
      } catch {
        // ignore quota errors
      }
    }, DEBOUNCE_MS)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [values])

  function clearDraft() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
  }

  return { clearDraft }
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(portal)/solicitud/_components/use-form-draft.ts"
git commit -m "feat: hook de persistencia de borrador en localStorage"
```

---

## Task 9: Application API — GET /api/applications/plans

**Files:**
- Create: `src/app/api/applications/plans/route.ts`

- [ ] **Step 1: Create route**

Create `src/app/api/applications/plans/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServiceClient()

  const { data: plans, error } = await supabase
    .from('investment_plans')
    .select('id, name, type, annual_rate, min_amount, description')
    .eq('active', true)
    .order('min_amount', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Error al cargar los planes' }, { status: 500 })
  }

  return NextResponse.json({ plans: plans ?? [] })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/applications/plans/route.ts
git commit -m "feat: API pública para obtener planes activos"
```

---

## Task 10: Application API — POST /api/applications

**Files:**
- Create: `src/app/api/applications/route.ts`
- Create: `src/lib/email/new-application-email.ts`

- [ ] **Step 1: Create email template**

Create `src/lib/email/new-application-email.ts`:

```typescript
import { Resend } from 'resend'

interface SendNewApplicationParams {
  to: string[]
  investorName: string
  planName: string
  amount: number
  contractId: string
  dashboardUrl: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export async function sendNewApplicationEmail(params: SendNewApplicationParams) {
  const isLocalhost = process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')

  if (isLocalhost) {
    console.log('[DEV] Nueva solicitud externa:', {
      to: params.to,
      investor: params.investorName,
      plan: params.planName,
      amount: params.amount,
    })
    return { success: true, dev: true }
  }

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
        <tr><td style="padding:32px 40px 24px;border-bottom:1px solid #f4f4f5;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#18181b;">Grandir CM</p>
          <p style="margin:4px 0 0;font-size:13px;color:#71717a;">Nueva solicitud de inversión</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6;">
            Se recibió una nueva solicitud de inversión a través del formulario público.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9fb;border-radius:8px;border:1px solid #e4e4e7;">
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e4e4e7;">
              <span style="font-size:12px;color:#71717a;">Inversionista</span>
              <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#18181b;">${params.investorName}</p>
            </td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e4e4e7;">
              <span style="font-size:12px;color:#71717a;">Plan</span>
              <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#18181b;">${params.planName}</p>
            </td></tr>
            <tr><td style="padding:14px 20px;">
              <span style="font-size:12px;color:#71717a;">Monto solicitado</span>
              <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#18181b;">${formatCurrency(params.amount)}</p>
            </td></tr>
          </table>
          <div style="margin-top:28px;text-align:center;">
            <a href="${params.dashboardUrl}" style="display:inline-block;padding:14px 32px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
              Revisar solicitud
            </a>
          </div>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #f4f4f5;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
            Revisa la solicitud en el dashboard y continúa el proceso según corresponda.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

  const resend = new Resend(process.env.RESEND_API_KEY)
  const result = await resend.emails.send({
    from: 'Grandir CM <sistema@grandir.com>',
    to: params.to,
    subject: `Nueva solicitud: ${params.investorName} — ${params.planName}`,
    html,
  })

  return { success: true, data: result }
}
```

- [ ] **Step 2: Create API route**

Create `src/app/api/applications/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendNewApplicationEmail } from '@/lib/email/new-application-email'
import { normalizeCedula } from '@/lib/investment/format'

interface ApplicationBody {
  full_name: string
  cedula: string
  phone: string
  email: string
  plan_id: string
  amount: number
  term_months: number
  beneficiaries?: Array<{
    full_name: string
    cedula: string
    phone: string
  }>
}

// Simple in-memory rate limit: 5 solicitudes/hora por IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60 * 60 * 1000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT) return false

  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'RATE_LIMIT', message: 'Demasiadas solicitudes. Intenta más tarde.' },
        { status: 429 }
      )
    }

    const body = (await request.json()) as ApplicationBody

    // Validación básica
    if (
      !body.full_name?.trim() ||
      !body.cedula?.trim() ||
      !body.email?.trim() ||
      !body.plan_id ||
      !body.amount ||
      !body.term_months
    ) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: 'Faltan campos obligatorios.' },
        { status: 400 }
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json(
        { error: 'INVALID_EMAIL', message: 'Email inválido.' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Validar plan
    const { data: plan, error: planError } = await supabase
      .from('investment_plans')
      .select('id, name, active, min_amount')
      .eq('id', body.plan_id)
      .single()

    if (planError || !plan || !plan.active) {
      return NextResponse.json(
        { error: 'INVALID_PLAN', message: 'Plan no disponible.' },
        { status: 400 }
      )
    }

    if (body.amount < plan.min_amount) {
      return NextResponse.json(
        { error: 'AMOUNT_TOO_LOW', message: `El monto mínimo para este plan es ${plan.min_amount}.` },
        { status: 400 }
      )
    }

    // Buscar o crear investor
    const normalizedCedula = normalizeCedula(body.cedula)
    const cedulaWithFormat = body.cedula.trim()

    let investorId: string
    const { data: existingInvestor } = await supabase
      .from('investors')
      .select('id')
      .eq('cedula', cedulaWithFormat)
      .maybeSingle()

    if (existingInvestor) {
      investorId = existingInvestor.id
    } else {
      const { data: newInvestor, error: investorError } = await supabase
        .from('investors')
        .insert({
          full_name: body.full_name.trim(),
          cedula: cedulaWithFormat,
          phone: body.phone?.trim() || null,
          status: 'active',
        })
        .select('id')
        .single()

      if (investorError || !newInvestor) {
        return NextResponse.json(
          { error: 'INVESTOR_CREATE_FAILED', message: 'Error al crear inversionista.' },
          { status: 500 }
        )
      }
      investorId = newInvestor.id

      // Email
      await supabase.from('investor_emails').insert({
        investor_id: investorId,
        email: body.email.trim().toLowerCase(),
        is_primary: true,
        verified: false,
      })
    }

    // Crear contract con source = external_form
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert({
        plan_id: body.plan_id,
        amount: body.amount,
        term_months: body.term_months,
        status: 'draft',
        source: 'external_form',
        report_frequency_months: 2,
        version: 1,
      })
      .select('id')
      .single()

    if (contractError || !contract) {
      return NextResponse.json(
        { error: 'CONTRACT_CREATE_FAILED', message: 'Error al crear contrato.' },
        { status: 500 }
      )
    }

    // Crear contract_investor (holder)
    await supabase.from('contract_investors').insert({
      contract_id: contract.id,
      investor_id: investorId,
      role: 'holder',
      approval_status: 'pending',
    })

    // Crear beneficiarios si hay
    if (body.beneficiaries && body.beneficiaries.length > 0) {
      for (const b of body.beneficiaries) {
        if (!b.full_name?.trim() || !b.cedula?.trim()) continue

        const cedula = b.cedula.trim()
        let beneficiaryId: string

        const { data: existingBen } = await supabase
          .from('beneficiaries')
          .select('id')
          .eq('cedula', cedula)
          .maybeSingle()

        if (existingBen) {
          beneficiaryId = existingBen.id
        } else {
          const { data: newBen } = await supabase
            .from('beneficiaries')
            .insert({
              full_name: b.full_name.trim(),
              cedula,
              phone: b.phone?.trim() || null,
            })
            .select('id')
            .single()

          if (!newBen) continue
          beneficiaryId = newBen.id
        }

        await supabase.from('contract_beneficiaries').insert({
          contract_id: contract.id,
          beneficiary_id: beneficiaryId,
        })
      }
    }

    // Crear notificación para admins
    const { data: admins } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'admin')

    if (admins && admins.length > 0) {
      await supabase.from('notifications').insert(
        admins.map((admin) => ({
          recipient_user_id: admin.id,
          type: 'new_application' as const,
          channel: 'both' as const,
          title: 'Nueva solicitud externa',
          body: `${body.full_name} solicitó un contrato del plan ${plan.name}`,
          contract_id: contract.id,
          investor_id: investorId,
        }))
      )

      // Enviar emails a admins
      const adminEmails: string[] = []
      for (const admin of admins) {
        const { data: authUser } = await supabase.auth.admin.getUserById(admin.id)
        if (authUser?.user?.email) adminEmails.push(authUser.user.email)
      }

      if (adminEmails.length > 0) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        await sendNewApplicationEmail({
          to: adminEmails,
          investorName: body.full_name,
          planName: plan.name,
          amount: body.amount,
          contractId: contract.id,
          dashboardUrl: `${appUrl}/dashboard/contracts/${contract.id}`,
        })
      }
    }

    // Suprimir warning de variable no usada
    void normalizedCedula

    return NextResponse.json({ success: true, application_id: contract.id })
  } catch (err) {
    console.error('[applications] Error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -15
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/applications/route.ts src/lib/email/new-application-email.ts
git commit -m "feat: API POST para crear solicitudes externas con notificación al admin"
```

---

## Task 11: Success Screen Component

**Files:**
- Create: `src/app/(portal)/solicitud/_components/success-screen.tsx`

- [ ] **Step 1: Create component**

Create `src/app/(portal)/solicitud/_components/success-screen.tsx`:

```tsx
'use client'

import { Check } from 'lucide-react'

export function SuccessScreen() {
  return (
    <div className="max-w-md mx-auto text-center space-y-6 py-12">
      <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <Check size={32} className="text-green-600" strokeWidth={3} />
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">¡Solicitud recibida!</h1>
        <p className="text-sm text-zinc-600 leading-relaxed">
          Hemos recibido tu solicitud. El equipo de Grandir CM se pondrá en contacto contigo
          pronto para continuar el proceso.
        </p>
      </div>

      <p className="text-xs text-zinc-400">
        Si tienes alguna consulta, puedes escribirnos directamente.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(portal)/solicitud/_components/success-screen.tsx"
git commit -m "feat: pantalla de éxito tras envío de solicitud"
```

---

## Task 12: Main Application Form Component

**Files:**
- Create: `src/app/(portal)/solicitud/_components/application-form.tsx`

- [ ] **Step 1: Create component**

Create `src/app/(portal)/solicitud/_components/application-form.tsx`:

```tsx
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
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight">
          Solicitá tu inversión
        </h1>
        <p className="mt-3 text-sm sm:text-base text-zinc-600">
          Completá el formulario y nuestro equipo te contactará pronto.
        </p>
      </div>

      {/* Sección 1: Plan */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">1. Seleccioná tu plan</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Elegí el plan que mejor se adapte a vos</p>
        </div>
        <PlanSelector plans={plans} selectedId={values.plan_id} onSelect={handlePlanSelect} />
      </section>

      {/* Sección 2: Calculadora */}
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

      {/* Sección 3: Datos personales */}
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

      {/* Sección 4: Beneficiarios */}
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

      {/* Sección 5: Enviar */}
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
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -15
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(portal)/solicitud/_components/application-form.tsx"
git commit -m "feat: formulario completo de solicitud externa con calculadora integrada"
```

---

## Task 13: Public Page `/solicitud`

**Files:**
- Create: `src/app/(portal)/solicitud/page.tsx`

- [ ] **Step 1: Create page**

Create `src/app/(portal)/solicitud/page.tsx`:

```tsx
import { createServiceClient } from '@/lib/supabase/server'
import { ApplicationForm } from './_components/application-form'
import type { PlanOption } from './_components/plan-selector'

export const metadata = {
  title: 'Solicitá tu inversión | Grandir CM',
  description: 'Formulario de solicitud de inversión con Grandir CM',
}

export default async function SolicitudPage() {
  const supabase = createServiceClient()

  const { data: plans } = await supabase
    .from('investment_plans')
    .select('id, name, type, annual_rate, min_amount, description')
    .eq('active', true)
    .order('min_amount', { ascending: true })

  const planOptions: PlanOption[] = (plans ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type as 'annual' | 'monthly' | 'semestral',
    annual_rate: p.annual_rate,
    min_amount: p.min_amount,
    description: p.description,
  }))

  if (planOptions.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">
          No hay planes disponibles
        </h1>
        <p className="text-sm text-zinc-600">
          En este momento no hay planes de inversión activos. Intenta más tarde.
        </p>
      </div>
    )
  }

  return <ApplicationForm plans={planOptions} />
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -5
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(portal)/solicitud/page.tsx"
git commit -m "feat: página pública /solicitud con formulario de aplicación"
```

---

## Task 14: Dashboard Filter by Source

**Files:**
- Modify: `src/app/(dashboard)/dashboard/contracts/page.tsx`

- [ ] **Step 1: Read current file**

Read `src/app/(dashboard)/dashboard/contracts/page.tsx` to understand the current structure of the contracts list page.

- [ ] **Step 2: Add source filter**

Add a filter dropdown "Origen" with options: "Todos", "Formulario externo", "Manual". The filter should:
1. Be controlled via URL search params (like existing filters if any)
2. Apply to the contracts query (add `.eq('source', source)` if filter is set)
3. Show a visual badge on each contract row indicating its source

For the source badge in the contracts table, show:
- External form: small green badge "Externa"
- Manual: small zinc badge "Manual"

Implementation approach: add to the existing filter section (if the page has one) or create a simple filter bar. If the page doesn't use URL params for filters, use React state.

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -5
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/dashboard/contracts/page.tsx"
git commit -m "feat: filtro por origen en lista de contratos del dashboard"
```

---

## Task 15: Integration Test

- [ ] **Step 1: Full compilation check**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 2: Start dev server and test**

```bash
npm run dev
```

Test flow:
1. Abrir `http://localhost:3000/solicitud` — debe cargar
2. Seleccionar un plan — card se marca como seleccionada
3. Ingresar un monto menor al mínimo — ver validación
4. Ingresar un monto válido — calculadora se actualiza en vivo
5. Cambiar plazo — calculadora actualiza
6. Llenar datos personales + agregar 1 beneficiario
7. Aceptar checkbox y enviar
8. Verificar pantalla de éxito
9. En consola del servidor verificar log del email al admin
10. En dashboard verificar que aparece el nuevo contrato en "Borrador" con badge "Externa"
11. Verificar notificación in-app para el admin

- [ ] **Step 3: Commit fixes si hay**

```bash
git add -A
git commit -m "fix: ajustes de integración del formulario externo"
```

---

## Dependency Graph

```
Task 1 (Migration) ─── Task 2 (Types) ─── Task 3 (Utilities)
                                              │
                                              ├── Task 4 (Calculator logic) ─── Task 5 (Calculator UI)
                                              │
                                              ├── Task 6 (Plan Selector)
                                              ├── Task 7 (Beneficiary Form)
                                              ├── Task 8 (Draft Hook)
                                              │
                                              ├── Task 9 (API GET plans)
                                              ├── Task 10 (API POST applications)
                                              │
                                              ├── Task 11 (Success Screen)
                                              │
                                              └── Task 12 (Application Form) ← depends on 5, 6, 7, 8, 11
                                                    │
                                                    └── Task 13 (Public Page) ← depends on 12
                                                          │
                                                          └── Task 14 (Dashboard filter)
                                                                │
                                                                └── Task 15 (Integration test)
```

**Parallelizable groups:**
- **Group A (foundation):** Tasks 1, 2, 3 (sequential)
- **Group B (building blocks):** Tasks 4, 5, 6, 7, 8, 9, 10, 11 (parallel after Group A)
- **Group C (assembly):** Task 12 (after B)
- **Group D (integration):** Tasks 13, 14 (after C)
- **Group E (test):** Task 15 (after D)
