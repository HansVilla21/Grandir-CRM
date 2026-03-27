import { createAdminClient } from '@/lib/supabase/server'
import { BulletinForm } from '../_components/bulletin-form'

export const metadata = {
  title: 'Nuevo boletín | Grandir CM',
}

export default async function NewBulletinPage() {
  const supabase = await createAdminClient()

  const { data: plansRaw } = await supabase
    .from('investment_plans')
    .select('id, name')
    .eq('active', true)
    .order('name')

  const plans = (plansRaw ?? []).map((p) => ({ id: p.id, name: p.name }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Nuevo boletín</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Redacta y guarda el comunicado como borrador antes de enviarlo.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
        <BulletinForm plans={plans} />
      </div>
    </div>
  )
}
