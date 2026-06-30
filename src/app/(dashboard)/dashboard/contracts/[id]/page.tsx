import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ExternalLink, FileText } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { ContractStatusBadge } from '../_components/contract-status-badge'
import { ContractActions } from '../_components/contract-actions'
import { DocumentUpload } from '../_components/document-upload'
import { ContractPaymentsSection } from '../_components/contract-payments-section'
import { AdminSignatureBanner } from './_components/admin-signature-banner'
import { DocumentDownloadButton } from './_components/document-download-button'
import { InvestmentCalculator } from '@/components/investment/investment-calculator'
import type { PlanType } from '@/lib/investment/calculator'
import type { ContractDetail } from '@/types/contracts'
import type { ContractOption } from '@/types/payments'

export const metadata = {
  title: 'Contrato | Grandir CM',
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' }).format(
    new Date(dateStr)
  )
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  draft: 'Borrador',
  signed_contract: 'Contrato firmado',
  deposit_receipt: 'Comprobante de depósito',
  disbursement_receipt: 'Comprobante de desembolso',
  report: 'Reporte',
  addendum: 'Addendum',
}


const REPORT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  generated: 'Generado',
  sent: 'Enviado',
}

const APPROVAL_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  revision_requested: 'Revisión solicitada',
}

const ROLE_LABELS: Record<string, string> = {
  holder: 'Titular',
  co_investor: 'Co-inversionista',
}

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pending_approval: 'Pendiente de aprobación',
  revision_requested: 'Revisión solicitada',
  pending_admin_signature: 'Esperando firma de Grandir',
  active: 'Activo',
  expired: 'Vencido',
  cancelled: 'Cancelado',
}

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServiceClient()
  const authClient = await createClient()

  const {
    data: { user },
  } = await authClient.auth.getUser()

  // Fetch user role
  let userRole = 'assistant'
  if (user) {
    const { data: profile } = await authClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    userRole = profile?.role ?? 'assistant'
  }

  // Contract + plan
  const { data: contractRaw, error: contractError } = await supabase
    .from('contracts')
    .select(`
      *,
      plan:investment_plans(id, name, type, annual_rate, min_amount)
    `)
    .eq('id', id)
    .single()

  if (contractError || !contractRaw) {
    notFound()
  }

  // contract_investors with investor details
  const { data: contractInvestors } = await supabase
    .from('contract_investors')
    .select(`
      *,
      investor:investors(
        full_name, cedula,
        emails:investor_emails(email, is_primary)
      )
    `)
    .eq('contract_id', id)

  // Payments
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('contract_id', id)
    .order('payment_date', { ascending: false })

  // Documents
  const { data: documents } = await supabase
    .from('contract_documents')
    .select('*')
    .eq('contract_id', id)
    .order('created_at', { ascending: false })

  // Reports
  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .eq('contract_id', id)
    .order('period_start', { ascending: false })

  // Contracts for payment form (active + draft + pending)
  const { data: contractsForFormRaw } = await supabase
    .from('contracts')
    .select(`id, status, plan:investment_plans(name)`)
    .in('status', ['active', 'draft', 'pending_approval'])
    .order('created_at', { ascending: false })

  const formContractIds = (contractsForFormRaw ?? []).map((c) => c.id)
  const formHolderMap = new Map<string, string | null>()
  if (formContractIds.length > 0) {
    const { data: formHoldersRaw } = await supabase
      .from('contract_investors')
      .select('contract_id, investor:investors(full_name)')
      .in('contract_id', formContractIds)
      .eq('role', 'holder')
    for (const row of formHoldersRaw ?? []) {
      const inv = row.investor as { full_name: string } | null
      formHolderMap.set(row.contract_id, inv?.full_name ?? null)
    }
  }

  type FormContractRow = NonNullable<typeof contractsForFormRaw>[number]
  const contractsForForm: ContractOption[] = (contractsForFormRaw ?? []).map(
    (c: FormContractRow) => {
      const plan = c.plan as { name: string } | null
      return {
        id: c.id,
        holder_name: formHolderMap.get(c.id) ?? null,
        plan_name: plan?.name ?? '—',
        status: c.status,
      }
    }
  )

  const contract: ContractDetail = {
    ...contractRaw,
    plan: contractRaw.plan as ContractDetail['plan'],
    contract_investors: (contractInvestors ?? []) as ContractDetail['contract_investors'],
    payments: (payments ?? []) as ContractDetail['payments'],
    contract_documents: (documents ?? []) as ContractDetail['contract_documents'],
    reports: (reports ?? []) as ContractDetail['reports'],
  }

  const holder = contract.contract_investors.find((ci) => ci.role === 'holder')
  const holderName = (holder?.investor as { full_name?: string } | null)?.full_name ?? '—'

  const canEdit =
    contract.status === 'draft' || contract.status === 'revision_requested'

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/contracts"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ChevronLeft size={16} />
        Volver a contratos
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-lg font-semibold text-zinc-900">
                #{contract.id.slice(0, 8).toUpperCase()}
              </span>
              <ContractStatusBadge status={contract.status} />
            </div>
            <p className="mt-1 text-sm text-zinc-600">
              <span className="font-medium">{holderName}</span>
              {contract.plan && (
                <>
                  {' · '}
                  <span>{contract.plan.name}</span>
                </>
              )}
            </p>
          </div>
          <ContractActions
            contractId={contract.id}
            currentStatus={contract.status}
            userRole={userRole}
          />
        </div>
      </div>

      {/* Admin signature banner (only when waiting for admin signature) */}
      {contract.status === 'pending_admin_signature' && userRole === 'admin' && (
        <AdminSignatureBanner
          contractId={contract.id}
          contractShortId={contract.id.slice(0, 8).toUpperCase()}
          holderName={holderName}
          holderSignedAt={holder?.signed_at ?? null}
        />
      )}

      {/* Summary */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">Resumen</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Monto</p>
            <p className="text-sm font-semibold text-zinc-900">
              {formatCurrency(contract.amount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Plan</p>
            <p className="text-sm font-medium text-zinc-900">
              {contract.plan?.name ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Tasa anual</p>
            <p className="text-sm font-medium text-zinc-900">
              {contract.plan ? `${contract.plan.annual_rate}%` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Plazo</p>
            <p className="text-sm font-medium text-zinc-900">
              {contract.term_months} mes{contract.term_months !== 1 ? 'es' : ''}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Fecha de inicio</p>
            <p className="text-sm font-medium text-zinc-900">
              {formatDate(contract.start_date)}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Fecha de vencimiento</p>
            <p className="text-sm font-medium text-zinc-900">
              {formatDate(contract.end_date)}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Frecuencia de reportes</p>
            <p className="text-sm font-medium text-zinc-900">
              Cada {contract.report_frequency_months} mes
              {contract.report_frequency_months !== 1 ? 'es' : ''}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Versión</p>
            <p className="text-sm font-medium text-zinc-900">v{contract.version}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Creado</p>
            <p className="text-sm font-medium text-zinc-900">
              {formatDate(contract.created_at)}
            </p>
          </div>
        </div>
        {contract.notes && (
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <p className="text-xs text-zinc-500 mb-1">Notas</p>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{contract.notes}</p>
          </div>
        )}
      </div>

      {/* Proyección — calculadora de rendimiento */}
      {contract.plan && (
        <InvestmentCalculator
          planType={contract.plan.type as PlanType}
          annualRate={contract.plan.annual_rate}
          amount={contract.amount}
          termMonths={contract.term_months}
          startDate={contract.start_date ? new Date(contract.start_date) : undefined}
        />
      )}

      {/* Investors */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900">Inversionistas</h2>
        </div>
        {contract.contract_investors.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin inversionistas asociados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="text-left pl-4 sm:pl-6 pr-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Nombre
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Cédula
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Rol
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Aprobación
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Firma
                  </th>
                  <th className="text-left pl-4 pr-4 sm:pr-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Portal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {contract.contract_investors.map((ci) => {
                  const inv = ci.investor as {
                    full_name?: string
                    cedula?: string
                  } | null
                  return (
                    <tr key={ci.id}>
                      <td className="pl-4 sm:pl-6 pr-4 py-3 font-medium text-zinc-900">
                        {inv?.full_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-600">
                        {inv?.cedula ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {ROLE_LABELS[ci.role] ?? ci.role}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                            ci.approval_status === 'approved'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : ci.approval_status === 'revision_requested'
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}
                        >
                          {APPROVAL_STATUS_LABELS[ci.approval_status] ??
                            ci.approval_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {ci.signed_at ? (
                          <span className="text-xs text-green-700">
                            Firmado el {new Intl.DateTimeFormat('es-CR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(ci.signed_at))}
                          </span>
                        ) : ci.approval_status === 'pending' ? (
                          <span className="text-xs text-yellow-600">Pendiente de firma</span>
                        ) : null}
                      </td>
                      <td className="pl-4 pr-4 sm:pr-6 py-3">
                        {ci.portal_token ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs text-zinc-500">
                            {ci.portal_token.slice(0, 12)}…
                            <ExternalLink size={12} className="text-zinc-400" />
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {contract.contract_investors.some((ci) => ci.revision_comment) && (
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <p className="text-xs text-zinc-500 mb-1">Comentario de revisión</p>
            <p className="text-sm text-orange-700">
              {contract.contract_investors.find((ci) => ci.revision_comment)?.revision_comment}
            </p>
          </div>
        )}
      </div>

      {/* Payments */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6">
        <ContractPaymentsSection
          contractId={contract.id}
          payments={contract.payments}
          contracts={contractsForForm}
        />
      </div>

      {/* Documents */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">Documentos</h2>

        {contract.contract_documents.length === 0 ? (
          <p className="text-sm text-zinc-500 mb-4">Sin documentos adjuntos.</p>
        ) : (
          <div className="divide-y divide-zinc-100 mb-6">
            {contract.contract_documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 py-3">
                <FileText size={16} className="text-zinc-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">
                    {doc.file_name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}
                    {doc.file_size
                      ? ` · ${(doc.file_size / 1024).toFixed(0)} KB`
                      : ''}
                    {' · '}
                    {formatDate(doc.created_at)}
                  </p>
                </div>
                <DocumentDownloadButton
                  storagePath={doc.storage_path}
                  fileName={doc.file_name}
                />
              </div>
            ))}
          </div>
        )}

        <DocumentUpload contractId={contract.id} />
      </div>

      {/* Reports */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900">Reportes</h2>
          <Link
            href={`/dashboard/reports?contract_id=${contract.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Nuevo reporte
          </Link>
        </div>

        {contract.reports.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin reportes generados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="text-left pl-4 sm:pl-6 pr-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Período
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Enviado
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    PDF
                  </th>
                  <th className="text-right pl-4 pr-4 sm:pr-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Detalle
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {contract.reports.map((report) => (
                  <tr key={report.id}>
                    <td className="pl-4 sm:pl-6 pr-4 py-3 text-zinc-700 text-xs">
                      {formatDate(report.period_start)} — {formatDate(report.period_end)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                          report.status === 'sent'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : report.status === 'generated'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                        }`}
                      >
                        {REPORT_STATUS_LABELS[report.status] ?? report.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {formatDate(report.sent_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {report.pdf_path ? (
                        <span className="inline-flex items-center gap-1 text-xs text-zinc-600">
                          <FileText size={12} />
                          PDF
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="pl-4 pr-4 sm:pr-6 py-3 text-right">
                      <Link
                        href={`/dashboard/reports/${report.id}`}
                        className="text-xs text-zinc-500 hover:text-zinc-900 underline underline-offset-2 transition-colors"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit warning for non-editable contracts */}
      {!canEdit && (
        <p className="text-xs text-zinc-400 text-center pb-4">
          Los contratos en estado &ldquo;{CONTRACT_STATUS_LABELS[contract.status] ?? contract.status}&rdquo; no se pueden editar.
          Para modificar un contrato activo, crea un addendum.
        </p>
      )}
    </div>
  )
}
