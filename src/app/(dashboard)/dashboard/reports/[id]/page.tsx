import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, FileText, ExternalLink } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/server'
import { ReportSendButton } from '../_components/report-send-button'
import { ReportPdfUpload } from '../_components/report-pdf-upload'
import type { ReportDetail, ReportStatus } from '@/types/reports'

export const metadata = {
  title: 'Detalle de reporte | Grandir CM',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' }).format(
    new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''))
  )
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const config: Record<ReportStatus, { label: string; className: string }> = {
    pending: {
      label: 'Pendiente',
      className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    },
    generated: {
      label: 'PDF listo',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    sent: {
      label: 'Enviado',
      className: 'bg-green-50 text-green-700 border-green-200',
    },
  }
  const { label, className } = config[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${className}`}
    >
      {label}
    </span>
  )
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createAdminClient()

  // Fetch report with contract data
  const { data: reportRaw, error } = await supabase
    .from('reports')
    .select(`
      *,
      contracts (
        amount,
        investment_plans (name)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !reportRaw) {
    notFound()
  }

  // Holder name
  const { data: holderRow } = await supabase
    .from('contract_investors')
    .select('investors(full_name)')
    .eq('contract_id', reportRaw.contract_id)
    .eq('role', 'holder')
    .single()

  const holder = holderRow?.investors as { full_name: string } | null
  const contract = reportRaw.contracts as {
    amount: number
    investment_plans: { name: string } | null
  } | null

  // All investor emails
  const { data: contractInvestors } = await supabase
    .from('contract_investors')
    .select('investors(investor_emails(email, is_primary))')
    .eq('contract_id', reportRaw.contract_id)

  const recipientEmails: string[] = []
  for (const ci of contractInvestors ?? []) {
    const inv = ci.investors as {
      investor_emails: { email: string; is_primary: boolean }[]
    } | null
    for (const emailRow of inv?.investor_emails ?? []) {
      if (!recipientEmails.includes(emailRow.email)) {
        recipientEmails.push(emailRow.email)
      }
    }
  }

  // Signed URL for PDF
  let pdfSignedUrl: string | null = null
  if (reportRaw.pdf_path) {
    const { data: signed } = await supabase.storage
      .from('contracts')
      .createSignedUrl(reportRaw.pdf_path, 60 * 60) // 1 hour

    pdfSignedUrl = signed?.signedUrl ?? null
  }

  const report: ReportDetail = {
    id: reportRaw.id,
    contract_id: reportRaw.contract_id,
    period_start: reportRaw.period_start,
    period_end: reportRaw.period_end,
    growth_rate: reportRaw.growth_rate,
    calculated_amount: reportRaw.calculated_amount,
    description: reportRaw.description,
    pdf_path: reportRaw.pdf_path,
    status: reportRaw.status,
    sent_at: reportRaw.sent_at,
    sent_to: reportRaw.sent_to,
    created_at: reportRaw.created_at,
    updated_at: reportRaw.updated_at,
    holder_name: holder?.full_name ?? '—',
    plan_name: contract?.investment_plans?.name ?? '—',
    contract_amount: contract?.amount ?? 0,
    recipient_emails: recipientEmails,
  }

  const periodLabel = `${formatDate(report.period_start)} — ${formatDate(report.period_end)}`

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/reports"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ChevronLeft size={16} />
        Volver a reportes
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-base font-semibold text-zinc-900">{periodLabel}</h1>
              <StatusBadge status={report.status} />
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              {report.holder_name} · {report.plan_name}
            </p>
          </div>
          <Link
            href={`/dashboard/contracts/${report.contract_id}`}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Ver contrato
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* Contract info */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">Contrato</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Inversionista</p>
            <p className="text-sm font-medium text-zinc-900">{report.holder_name}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Plan</p>
            <p className="text-sm font-medium text-zinc-900">{report.plan_name}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Monto del contrato</p>
            <p className="text-sm font-medium text-zinc-900">
              {formatCurrency(report.contract_amount)}
            </p>
          </div>
        </div>
      </div>

      {/* Report data */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">Datos del reporte</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Tasa de crecimiento</p>
            <p className="text-sm font-semibold text-zinc-900 font-mono">
              {report.growth_rate.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Monto calculado</p>
            <p className="text-sm font-medium text-zinc-900">
              {report.calculated_amount != null
                ? formatCurrency(report.calculated_amount)
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Creado</p>
            <p className="text-sm text-zinc-600">{formatDate(report.created_at)}</p>
          </div>
        </div>

        {report.description && (
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <p className="text-xs text-zinc-500 mb-1">Descripción</p>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{report.description}</p>
          </div>
        )}
      </div>

      {/* PDF */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">PDF del reporte</h2>

        <div className="space-y-4">
          {pdfSignedUrl && (
            <a
              href={pdfSignedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 border border-zinc-200 rounded-lg hover:bg-zinc-200 transition-colors"
            >
              <FileText size={14} />
              Ver PDF
              <ExternalLink size={12} className="text-zinc-400" />
            </a>
          )}

          {report.status !== 'sent' && (
            <ReportPdfUpload
              reportId={report.id}
              currentPdfPath={report.pdf_path}
            />
          )}

          {!report.pdf_path && (
            <p className="text-sm text-zinc-400">No hay PDF adjunto.</p>
          )}
        </div>
      </div>

      {/* Envío */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">Envío</h2>

        {report.status === 'sent' && report.sent_at && (
          <p className="text-sm text-zinc-500 mb-4">
            Enviado el{' '}
            <span className="font-medium text-zinc-900">{formatDate(report.sent_at)}</span>
            {report.sent_to && report.sent_to.length > 0 && (
              <>
                {' '}a{' '}
                <span className="font-medium text-zinc-900">
                  {report.sent_to.join(', ')}
                </span>
              </>
            )}
          </p>
        )}

        <ReportSendButton
          reportId={report.id}
          status={report.status}
          recipientEmails={report.recipient_emails}
        />
      </div>
    </div>
  )
}
