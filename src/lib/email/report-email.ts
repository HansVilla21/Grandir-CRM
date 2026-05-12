import { Resend } from 'resend'
import { EMAIL_FROM } from './config'

interface SendReportEmailParams {
  to: string[]
  investorName: string
  contractId: string
  periodStart: string
  periodEnd: string
  growthRate: number
  calculatedAmount: number | null
  description: string | null
  pdfUrl: string | null
}

function formatPeriod(dateStr: string): string {
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' }).format(
    new Date(dateStr)
  )
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export async function sendReportEmail(params: SendReportEmailParams) {
  const isLocalhost = process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')

  if (isLocalhost) {
    console.log('[DEV] Email no enviado (modo test):', {
      to: params.to,
      investor: params.investorName,
      period: `${params.periodStart} - ${params.periodEnd}`,
      growthRate: params.growthRate,
    })
    return { success: true, dev: true }
  }

  const periodLabel = `${formatPeriod(params.periodStart)} al ${formatPeriod(params.periodEnd)}`

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reporte de inversión</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #f4f4f5;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#18181b;letter-spacing:-0.3px;">Grandir CM</p>
              <p style="margin:4px 0 0;font-size:13px;color:#71717a;">Reporte periódico de inversión</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 24px;font-size:14px;color:#52525b;">
                Estimado/a <strong style="color:#18181b;">${params.investorName}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6;">
                Adjunto encontrará el reporte correspondiente al período <strong style="color:#18181b;">${periodLabel}</strong>.
              </p>

              <!-- Data table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9fb;border-radius:8px;border:1px solid #e4e4e7;">
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid #e4e4e7;">
                    <span style="font-size:12px;color:#71717a;">Período</span>
                    <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#18181b;">${periodLabel}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid #e4e4e7;">
                    <span style="font-size:12px;color:#71717a;">Tasa de crecimiento</span>
                    <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#18181b;">${params.growthRate.toFixed(2)}%</p>
                  </td>
                </tr>
                ${
                  params.calculatedAmount !== null
                    ? `<tr>
                  <td style="padding:14px 20px;">
                    <span style="font-size:12px;color:#71717a;">Monto calculado</span>
                    <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#18181b;">${formatCurrency(params.calculatedAmount)}</p>
                  </td>
                </tr>`
                    : ''
                }
              </table>

              ${
                params.description
                  ? `<div style="margin-top:24px;padding:16px 20px;background:#f9f9fb;border-radius:8px;border:1px solid #e4e4e7;">
                <p style="margin:0 0 6px;font-size:12px;color:#71717a;">Observaciones</p>
                <p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.6;">${params.description}</p>
              </div>`
                  : ''
              }

              ${
                params.pdfUrl
                  ? `<div style="margin-top:28px;text-align:center;">
                <a href="${params.pdfUrl}" style="display:inline-block;padding:12px 28px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;">
                  Ver reporte PDF
                </a>
              </div>`
                  : ''
              }
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #f4f4f5;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
                Este correo fue enviado por Grandir CM. Para consultas, responda a este mensaje o contáctenos directamente.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  const resend = new Resend(process.env.RESEND_API_KEY)
  const result = await resend.emails.send({
    from: EMAIL_FROM.reportes,
    to: params.to,
    subject: `Reporte de inversión — ${periodLabel}`,
    html,
  })

  return { success: true, data: result }
}
