import type { PortalData } from '@/types/portal'
import { PortalApproveButton } from './portal-approve-button'
import { PortalRevisionButton } from './portal-revision-button'
import { PortalDocumentUpload } from './portal-document-upload'

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Por confirmar'
  return new Intl.DateTimeFormat('es-CR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateStr + 'T12:00:00'))
}

function describePaymentStructure(planType: string): string {
  if (planType === 'annual') return 'Pago unico al vencimiento del contrato'
  if (planType === 'monthly') return 'Pagos mensuales del 10% a partir del mes 3, resto al vencimiento'
  if (planType === 'semestral') return 'Pagos semestrales del 40%, resto al vencimiento'
  return 'Ver terminos del contrato'
}

function translateContractStatus(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Borrador',
    pending_approval: 'Pendiente de aprobacion',
    revision_requested: 'Revision solicitada',
    active: 'Activo',
    expired: 'Vencido',
    cancelled: 'Cancelado',
  }
  return labels[status] ?? status
}

function translatePaymentType(type: string): string {
  const labels: Record<string, string> = {
    deposit: 'Deposito',
    withdrawal: 'Retiro',
    commission: 'Comision',
  }
  return labels[type] ?? type
}

function translateDocumentType(type: string): string {
  const labels: Record<string, string> = {
    draft: 'Borrador',
    signed_contract: 'Contrato firmado',
    deposit_receipt: 'Comprobante de deposito',
    disbursement_receipt: 'Comprobante de desembolso',
    report: 'Reporte',
    addendum: 'Addendum',
  }
  return labels[type] ?? type
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    pending_approval: 'bg-amber-100 text-amber-800',
    revision_requested: 'bg-red-100 text-red-800',
    expired: 'bg-zinc-100 text-zinc-600',
    cancelled: 'bg-red-100 text-red-700',
    draft: 'bg-zinc-100 text-zinc-600',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${colors[status] ?? 'bg-zinc-100 text-zinc-600'}`}
    >
      {translateContractStatus(status)}
    </span>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────

interface PortalContractViewProps {
  data: PortalData
  token: string
}

export function PortalContractView({ data, token }: PortalContractViewProps) {
  const { contractInvestor, investor, contract, plan, payments, documents, reports } = data

  const isPendingApproval =
    contractInvestor.approval_status === 'pending' &&
    contract.status === 'pending_approval'

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-6 sm:space-y-8">

      {/* Header de bienvenida */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">
          Bienvenido, {investor?.full_name ?? 'Inversionista'}
        </h1>
        <p className="mt-1 text-base sm:text-lg text-zinc-500">
          Contrato de Inversion &mdash; {plan?.name ?? 'Plan de inversion'}
        </p>
      </div>

      {/* Card de estado */}
      <div className="rounded-xl bg-white border border-zinc-200 p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-zinc-500">Estado del contrato:</span>
          <StatusBadge status={contract.status} />
          {contractInvestor.role === 'co_investor' && (
            <span className="text-xs bg-zinc-100 text-zinc-500 rounded-full px-2.5 py-1">
              Co-inversionista
            </span>
          )}
        </div>

        {contractInvestor.approval_status === 'pending' && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">Tu aprobacion esta pendiente</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Revisa los terminos de tu contrato y confirma tu aprobacion al final de esta pagina.
            </p>
          </div>
        )}

        {contractInvestor.approval_status === 'revision_requested' && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm font-semibold text-red-800">Revision solicitada</p>
            {contractInvestor.revision_comment && (
              <p className="text-sm text-red-700 mt-1 whitespace-pre-wrap">
                {contractInvestor.revision_comment}
              </p>
            )}
          </div>
        )}

        {contractInvestor.approval_status === 'approved' && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <p className="text-sm font-semibold text-green-800">
              Contrato aprobado
              {contractInvestor.approved_at
                ? ` el ${formatDate(contractInvestor.approved_at)}`
                : ''}
            </p>
          </div>
        )}
      </div>

      {/* Resumen de inversion */}
      <div className="rounded-xl bg-white border border-zinc-200 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">
          Resumen de tu inversion
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <div>
            <dt className="text-sm text-zinc-500">Monto invertido</dt>
            <dd className="mt-1 text-2xl font-bold text-zinc-900">
              {formatCurrency(contract.amount)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Plan</dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-800">
              {plan?.name ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Tasa de rendimiento anual</dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-800">
              {plan ? `${plan.annual_rate}%` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Plazo</dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-800">
              {contract.term_months} meses
            </dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Fecha de inicio</dt>
            <dd className="mt-1 text-base font-medium text-zinc-800">
              {formatDate(contract.start_date)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-zinc-500">Fecha de vencimiento</dt>
            <dd className="mt-1 text-base font-medium text-zinc-800">
              {formatDate(contract.end_date)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-zinc-500">Estructura de pagos</dt>
            <dd className="mt-1 text-base text-zinc-800">
              {plan ? describePaymentStructure(plan.type) : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Pagos */}
      {payments.length > 0 && (
        <div className="rounded-xl bg-white border border-zinc-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-5">Pagos recibidos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="pb-3 text-left font-medium text-zinc-500">Tipo</th>
                  <th className="pb-3 text-right font-medium text-zinc-500">Monto</th>
                  <th className="pb-3 text-right font-medium text-zinc-500">Fecha</th>
                  <th className="pb-3 text-right font-medium text-zinc-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-3 text-zinc-700">{translatePaymentType(payment.type)}</td>
                    <td className="py-3 text-right font-semibold text-zinc-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="py-3 text-right text-zinc-600">
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Verificado
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-zinc-200">
                  <td colSpan={2} className="pt-3 text-sm font-semibold text-zinc-700">
                    Total recibido
                  </td>
                  <td colSpan={2} className="pt-3 text-right text-lg font-bold text-zinc-900">
                    {formatCurrency(totalPaid)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Documentos */}
      <div className="rounded-xl bg-white border border-zinc-200 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">Documentos</h2>

        {documents.length === 0 ? (
          <p className="text-sm text-zinc-500">No hay documentos disponibles aun.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {documents.map((doc) => (
              <li key={doc.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-zinc-800">{doc.file_name}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {translateDocumentType(doc.type)} &bull; {formatDate(doc.created_at)}
                  </p>
                </div>
                {doc.signed_url ? (
                  <a
                    href={doc.signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-sm font-medium text-green-700 hover:text-green-800 hover:underline"
                  >
                    Descargar
                  </a>
                ) : (
                  <span className="shrink-0 text-sm text-zinc-400">No disponible</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Upload solo si está pendiente de aprobación */}
        {isPendingApproval && (
          <div className="mt-6 pt-6 border-t border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-700 mb-4">
              Subir documento
            </h3>
            <PortalDocumentUpload token={token} />
          </div>
        )}
      </div>

      {/* Reportes */}
      {reports.length > 0 && (
        <div className="rounded-xl bg-white border border-zinc-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-5">Reportes periodicos</h2>
          <ul className="divide-y divide-zinc-100">
            {reports.map((report) => (
              <li key={report.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-zinc-800">
                    Periodo: {formatDate(report.period_start)} — {formatDate(report.period_end)}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Rendimiento: {report.growth_rate}%
                    {report.calculated_amount != null
                      ? ` &bull; ${formatCurrency(report.calculated_amount)}`
                      : ''}
                    {report.sent_at ? ` &bull; Enviado el ${formatDate(report.sent_at)}` : ''}
                  </p>
                </div>
                {report.signed_url ? (
                  <a
                    href={report.signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-sm font-medium text-green-700 hover:text-green-800 hover:underline"
                  >
                    Ver PDF
                  </a>
                ) : (
                  <span className="shrink-0 text-sm text-zinc-400">Sin PDF</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Acciones: solo si está pendiente */}
      {isPendingApproval && (
        <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              ¿Estas de acuerdo con los terminos del contrato?
            </h2>
            <p className="text-sm text-zinc-600 mt-1">
              Revisa cuidadosamente la informacion antes de confirmar tu decision.
            </p>
          </div>
          <div className="space-y-3">
            <PortalApproveButton token={token} amount={contract.amount} />
            <PortalRevisionButton token={token} />
          </div>
        </div>
      )}
    </div>
  )
}
