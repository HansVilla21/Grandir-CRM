import { createServiceClient } from '@/lib/supabase/server'
import { ApplicationForm } from './_components/application-form'
import type { PlanOption } from './_components/plan-selector'

export const metadata = {
  title: 'Solicitá tu inversión | Grandir CM',
  description: 'Formulario de solicitud de inversión con Grandir CM',
}

// Página pública que consulta Supabase en cada request — no se debe prerender en build
export const dynamic = 'force-dynamic'

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
