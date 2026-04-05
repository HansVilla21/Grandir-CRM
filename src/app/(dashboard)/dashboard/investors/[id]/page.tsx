import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, Calendar, User, CheckCircle2 } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { InvestorStatusToggle } from '../_components/investor-status-toggle'
import { InvestorEditButton } from '../_components/investor-edit-button'
import { InvestorDeleteButton } from '../_components/investor-delete-button'
import { cn } from '@/lib/utils'
import type { InvestorDetail, LinkedContract } from '@/types/investors'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('investors')
    .select('full_name')
    .eq('id', id)
    .single()

  return {
    title: data ? `${data.full_name} | Grandir CM` : 'Inversionista | Grandir CM',
  }
}

function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border',
        status === 'active'
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-zinc-100 text-zinc-500 border-zinc-200'
      )}
    >
      {status === 'active' ? 'Activo' : 'Inactivo'}
    </span>
  )
}

function ContractStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; classes: string }> = {
    draft: { label: 'Borrador', classes: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
    pending_approval: { label: 'Pendiente', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
    revision_requested: { label: 'En revisión', classes: 'bg-orange-50 text-orange-700 border-orange-200' },
    active: { label: 'Activo', classes: 'bg-green-50 text-green-700 border-green-200' },
    expired: { label: 'Vencido', classes: 'bg-zinc-100 text-zinc-400 border-zinc-200' },
    cancelled: { label: 'Cancelado', classes: 'bg-red-50 text-red-600 border-red-200' },
  }
  const config = map[status] ?? { label: status, classes: 'bg-zinc-100 text-zinc-500 border-zinc-200' }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border', config.classes)}>
      {config.label}
    </span>
  )
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default async function InvestorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createAdminClient()

  // Investor
  const { data: investorRaw, error } = await supabase
    .from('investors')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !investorRaw) {
    notFound()
  }

  // Emails
  const { data: emails } = await supabase
    .from('investor_emails')
    .select('id, investor_id, email, is_primary, verified, created_at')
    .eq('investor_id', id)

  // Referrer
  let referrer: { id: string; full_name: string } | null = null
  if (investorRaw.referrer_id) {
    const { data: ref } = await supabase
      .from('investors')
      .select('id, full_name')
      .eq('id', investorRaw.referrer_id)
      .single()
    referrer = ref
  }

  const investor: InvestorDetail = {
    ...investorRaw,
    emails: emails ?? [],
    referrer,
  }

  // Contracts
  const { data: contractInvestorsRaw } = await supabase
    .from('contract_investors')
    .select(`
      id,
      role,
      approval_status,
      contracts:contract_id(
        id,
        amount,
        status,
        start_date,
        end_date,
        term_months,
        plan:plan_id(id, name, type)
      )
    `)
    .eq('investor_id', id)

  const contractInvestors = (contractInvestorsRaw ?? []) as unknown as LinkedContract[]

  // Active investors for edit form referrer select
  const { data: allInvestors } = await supabase
    .from('investors')
    .select('id, full_name')
    .eq('status', 'active')
    .neq('id', id)
    .order('full_name', { ascending: true })

  const activeInvestors = allInvestors ?? []

  const primaryEmail = investor.emails?.find((e) => e.is_primary)

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6 lg:px-0">
      {/* Back link */}
      <Link
        href="/dashboard/investors"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
      >
        <ArrowLeft size={14} />
        Inversionistas
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
              <span className="text-base font-semibold text-zinc-600">
                {investor.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">{investor.full_name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <StatusBadge status={investor.status} />
                {primaryEmail && (
                  <span className="text-sm text-zinc-500 break-all">{primaryEmail.email}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <InvestorStatusToggle
              investorId={investor.id}
              currentStatus={investor.status}
              investorName={investor.full_name}
            />
            <InvestorEditButton
              investor={investor}
              activeInvestors={activeInvestors}
            />
            <InvestorDeleteButton
              investorId={investor.id}
              investorName={investor.full_name}
            />
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">Información personal</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <User size={15} className="text-zinc-400 mt-0.5 flex-shrink-0" />
            <div>
              <dt className="text-xs text-zinc-500 mb-0.5">Cédula</dt>
              <dd className="text-sm font-medium text-zinc-900 font-mono">{investor.cedula}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone size={15} className="text-zinc-400 mt-0.5 flex-shrink-0" />
            <div>
              <dt className="text-xs text-zinc-500 mb-0.5">Teléfono</dt>
              <dd className="text-sm font-medium text-zinc-900">
                {investor.phone ?? <span className="text-zinc-400 font-normal">Sin teléfono</span>}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar size={15} className="text-zinc-400 mt-0.5 flex-shrink-0" />
            <div>
              <dt className="text-xs text-zinc-500 mb-0.5">Fecha de registro</dt>
              <dd className="text-sm font-medium text-zinc-900">{formatDate(investor.created_at)}</dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <User size={15} className="text-zinc-400 mt-0.5 flex-shrink-0" />
            <div>
              <dt className="text-xs text-zinc-500 mb-0.5">Referido por</dt>
              <dd className="text-sm font-medium text-zinc-900">
                {investor.referrer ? (
                  <Link
                    href={`/dashboard/investors/${investor.referrer.id}`}
                    className="text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
                  >
                    {investor.referrer.full_name}
                  </Link>
                ) : (
                  <span className="text-zinc-400 font-normal">Sin referidor</span>
                )}
              </dd>
            </div>
          </div>
        </dl>
      </div>

      {/* Emails */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900">Correos electrónicos</h2>
        </div>
        {investor.emails && investor.emails.length > 0 ? (
          <ul className="space-y-2">
            {investor.emails.map((emailRow) => (
              <li key={emailRow.id} className="flex items-center gap-3">
                <Mail size={14} className="text-zinc-400 flex-shrink-0" />
                <span className="text-sm text-zinc-700">{emailRow.email}</span>
                <div className="flex items-center gap-1.5 ml-auto">
                  {emailRow.is_primary && (
                    <span className="text-xs font-medium text-zinc-500 bg-zinc-100 rounded-full px-2 py-0.5">
                      Principal
                    </span>
                  )}
                  {emailRow.verified && (
                    <CheckCircle2 size={13} className="text-green-600" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-400 italic">Sin emails registrados</p>
        )}
      </div>

      {/* Contracts */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900">Contratos</h2>
          <span className="text-xs text-zinc-500">
            {contractInvestors.length} contrato{contractInvestors.length !== 1 ? 's' : ''}
          </span>
        </div>
        {contractInvestors.length === 0 ? (
          <p className="text-sm text-zinc-400 italic">Sin contratos asociados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-zinc-50 border-y border-zinc-100">
                  <th className="text-left pl-4 sm:pl-6 pr-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Plan
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Monto
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Rol
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Inicio
                  </th>
                  <th className="text-left pl-4 pr-4 sm:pr-6 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Vencimiento
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {contractInvestors.map((ci) => {
                  const contract = ci.contracts
                  if (!contract) return null
                  return (
                    <tr key={ci.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="pl-4 sm:pl-6 pr-4 py-3">
                        <Link
                          href={`/dashboard/contracts/${contract.id}`}
                          className="font-medium text-zinc-900 hover:underline"
                        >
                          {contract.plan?.name ?? '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {formatCurrency(contract.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <ContractStatusBadge status={contract.status} />
                      </td>
                      <td className="px-4 py-3 text-zinc-600 capitalize">
                        {ci.role === 'holder' ? 'Titular' : 'Co-inversionista'}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">
                        {formatDate(contract.start_date)}
                      </td>
                      <td className="pl-4 pr-4 sm:pr-6 py-3 text-zinc-500 text-xs">
                        {formatDate(contract.end_date)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
