import { createAdminClient } from '@/lib/supabase/server'
import { NewContractForm } from '../_components/new-contract-form'

export const metadata = {
  title: 'Nuevo contrato | Grandir CM',
}

export default async function NewContractPage() {
  const supabase = await createAdminClient()

  // Active plans
  const { data: plansRaw, error: plansError } = await supabase
    .from('investment_plans')
    .select('id, name, type, annual_rate, min_amount')
    .eq('active', true)
    .order('name', { ascending: true })

  // Active investors
  const { data: investorsRaw, error: investorsError } = await supabase
    .from('investors')
    .select('id, full_name, cedula')
    .eq('status', 'active')
    .order('full_name', { ascending: true })

  if (plansError || investorsError) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Error al cargar datos:{' '}
          {plansError?.message ?? investorsError?.message}
        </div>
      </div>
    )
  }

  const plans = (plansRaw ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    annual_rate: p.annual_rate,
    min_amount: p.min_amount,
  }))

  const investors = (investorsRaw ?? []).map((inv) => ({
    id: inv.id,
    full_name: inv.full_name,
    cedula: inv.cedula,
  }))

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Nuevo contrato</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Completa los datos para crear un contrato en estado borrador.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6">
        <NewContractForm plans={plans} investors={investors} />
      </div>
    </div>
  )
}
