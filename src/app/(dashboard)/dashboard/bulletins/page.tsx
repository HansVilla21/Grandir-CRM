import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { BulletinsTable } from './_components/bulletins-table'
import type { BulletinListItem } from '@/types/bulletins'

export const metadata = {
  title: 'Boletines | Grandir CM',
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-5">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-zinc-900">{value}</p>
    </div>
  )
}

export default async function BulletinsPage() {
  const supabase = await createAdminClient()

  const { data: raw } = await supabase
    .from('bulletins')
    .select(`
      id,
      subject,
      status,
      target_group,
      target_plan_id,
      sent_at,
      created_at,
      investment_plans:target_plan_id ( name ),
      bulletin_recipients ( id )
    `)
    .order('created_at', { ascending: false })

  type RawBulletin = NonNullable<typeof raw>[number]

  const bulletins: BulletinListItem[] = (raw ?? []).map((b: RawBulletin) => {
    const plan = b.investment_plans as { name: string } | null
    const recipients = b.bulletin_recipients as { id: string }[] | null
    return {
      id: b.id,
      subject: b.subject,
      status: b.status,
      target_group: b.target_group,
      target_plan_name: plan?.name ?? null,
      recipient_count: recipients?.length ?? 0,
      sent_at: b.sent_at,
      created_at: b.created_at,
    }
  })

  const drafts = bulletins.filter((b) => b.status === 'draft').length
  const sent = bulletins.filter((b) => b.status === 'sent').length
  const totalReached = bulletins
    .filter((b) => b.status === 'sent')
    .reduce((acc, b) => acc + b.recipient_count, 0)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Boletines</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Comunicados segmentados a inversionistas
          </p>
        </div>
        <Link
          href="/dashboard/bulletins/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors text-center sm:text-left"
        >
          Nuevo boletín
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Borradores" value={drafts} />
        <StatCard label="Enviados" value={sent} />
        <StatCard label="Total destinatarios alcanzados" value={totalReached} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6">
        <BulletinsTable bulletins={bulletins} />
      </div>
    </div>
  )
}
