import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { BulletinForm } from '../_components/bulletin-form'
import { BulletinSendButton } from '../_components/bulletin-send-button'
import { TARGET_GROUP_LABELS } from '@/types/bulletins'

export const metadata = {
  title: 'Boletín | Grandir CM',
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-CR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export default async function BulletinDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createAdminClient()

  const { data: bulletin, error } = await supabase
    .from('bulletins')
    .select(`
      id,
      subject,
      body,
      status,
      target_group,
      target_plan_id,
      sent_at,
      created_at,
      investment_plans:target_plan_id ( name ),
      bulletin_recipients (
        id,
        investor_id,
        email,
        delivered,
        opened,
        created_at
      )
    `)
    .eq('id', id)
    .single()

  if (error || !bulletin) {
    notFound()
  }

  const plan = bulletin.investment_plans as { name: string } | null
  const recipients = bulletin.bulletin_recipients as Array<{
    id: string
    investor_id: string
    email: string
    delivered: boolean
    opened: boolean
    created_at: string
  }> | null

  const targetLabel =
    bulletin.target_group === 'by_plan' && plan?.name
      ? `Plan ${plan.name}`
      : TARGET_GROUP_LABELS[bulletin.target_group] ?? bulletin.target_group

  // Fetch active plans for the edit form
  const { data: plansRaw } = await supabase
    .from('investment_plans')
    .select('id, name')
    .eq('active', true)
    .order('name')

  const plans = (plansRaw ?? []).map((p) => ({ id: p.id, name: p.name }))

  const isDraft = bulletin.status === 'draft'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/bulletins"
              className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Boletines
            </Link>
            <span className="text-zinc-300">/</span>
            <span className="text-sm text-zinc-600 truncate max-w-xs">
              {bulletin.subject}
            </span>
          </div>
          <h1 className="text-xl font-semibold text-zinc-900">
            {bulletin.subject}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span
              className={[
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                isDraft
                  ? 'bg-zinc-100 text-zinc-600'
                  : 'bg-emerald-50 text-emerald-700',
              ].join(' ')}
            >
              {isDraft ? 'Borrador' : 'Enviado'}
            </span>
            <span className="text-xs text-zinc-400">{targetLabel}</span>
          </div>
        </div>
      </div>

      {isDraft ? (
        <>
          {/* Edit form */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6">
            <BulletinForm
              plans={plans}
              bulletinId={bulletin.id}
              defaultValues={{
                subject: bulletin.subject,
                body: bulletin.body,
                target_group: bulletin.target_group,
                target_plan_id: bulletin.target_plan_id,
              }}
            />
          </div>

          {/* Send section */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6 space-y-3">
            <div>
              <p className="text-sm font-medium text-zinc-900">
                Enviar boletín
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Una vez enviado, el boletín no podrá editarse.
              </p>
            </div>
            <BulletinSendButton
              bulletinId={bulletin.id}
              estimatedCount={recipients?.length ?? 0}
              targetGroupLabel={targetLabel}
            />
          </div>
        </>
      ) : (
        <>
          {/* Read-only body */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-b border-zinc-100 pb-4">
              <div>
                <p className="text-xs text-zinc-400">Enviado el</p>
                <p className="text-zinc-900 mt-0.5">
                  {bulletin.sent_at ? formatDate(bulletin.sent_at) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Destinatarios</p>
                <p className="text-zinc-900 mt-0.5">
                  {recipients?.length ?? 0}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-zinc-400 mb-2">Contenido</p>
              <div className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap bg-zinc-50 rounded-lg border border-zinc-100 px-4 py-3">
                {bulletin.body}
              </div>
            </div>
          </div>

          {/* Recipients table */}
          {recipients && recipients.length > 0 && (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6 space-y-4">
              <p className="text-sm font-medium text-zinc-900">
                Destinatarios ({recipients.length})
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[540px]">
                  <thead>
                    <tr className="text-left text-xs text-zinc-400 border-b border-zinc-100">
                      <th className="pb-2 pl-4 sm:pl-6 pr-4 font-medium">Email</th>
                      <th className="pb-2 pr-4 font-medium text-center">
                        Entregado
                      </th>
                      <th className="pb-2 pr-4 sm:pr-6 font-medium text-center">Abierto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {recipients.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2.5 pl-4 sm:pl-6 pr-4 text-zinc-700">
                          {r.email}
                        </td>
                        <td className="py-2.5 pr-4 text-center">
                          <span
                            className={
                              r.delivered
                                ? 'text-emerald-600'
                                : 'text-zinc-300'
                            }
                          >
                            {r.delivered ? 'Si' : '—'}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 sm:pr-6 text-center">
                          <span
                            className={
                              r.opened ? 'text-emerald-600' : 'text-zinc-300'
                            }
                          >
                            {r.opened ? 'Si' : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
