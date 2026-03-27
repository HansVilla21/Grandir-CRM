import { createAdminClient } from '@/lib/supabase/server'
import { InvestorsTable } from './_components/investors-table'
import type { InvestorWithEmail } from '@/types/investors'

export const metadata = {
  title: 'Inversionistas | Grandir CM',
}

export default async function InvestorsPage() {
  const supabase = await createAdminClient()

  // Fetch all investors with primary email
  const { data: rawInvestors, error } = await supabase
    .from('investors')
    .select(`
      *,
      investor_emails(email, is_primary)
    `)
    .order('full_name', { ascending: true })

  if (error) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Error al cargar inversionistas: {error.message}
        </div>
      </div>
    )
  }

  // Flatten primary_email
  const investors: InvestorWithEmail[] = (rawInvestors ?? []).map((row) => {
    const emails = row.investor_emails as { email: string; is_primary: boolean }[]
    const primary = emails?.find((e) => e.is_primary)
    return {
      id: row.id,
      full_name: row.full_name,
      cedula: row.cedula,
      phone: row.phone,
      status: row.status,
      referrer_id: row.referrer_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      primary_email: primary?.email ?? null,
    }
  })

  // Active investors for referrer select
  const activeInvestors = investors
    .filter((inv) => inv.status === 'active')
    .map((inv) => ({ id: inv.id, full_name: inv.full_name }))

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-0">
      <InvestorsTable investors={investors} activeInvestors={activeInvestors} />
    </div>
  )
}
