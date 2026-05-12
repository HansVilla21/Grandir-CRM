import { Resend } from 'resend'
import { EMAIL_FROM } from './config'

interface SendSigningConfirmationEmailParams {
  to: string[]
  investorName: string
  planName: string
  amount: number
  signedAt: string
  portalUrl: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('es-CR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateStr))
}

export async function sendSigningConfirmationEmail(
  params: SendSigningConfirmationEmailParams
) {
  const isLocalhost = process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')

  if (isLocalhost) {
    console.log('[DEV] Email no enviado (modo test):', {
      to: params.to,
      investor: params.investorName,
      plan: params.planName,
      amount: params.amount,
      signedAt: params.signedAt,
    })
    return { success: true, dev: true }
  }

  const signedDate = formatDateTime(params.signedAt)

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Contrato firmado</title>
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
              <p style="margin:4px 0 0;font-size:13px;color:#71717a;">Confirmación de firma</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 24px;font-size:14px;color:#52525b;">
                Estimado/a <strong style="color:#18181b;">${params.investorName}</strong>,
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6;">
                Su contrato de inversión ha sido firmado exitosamente. A continuación el resumen:
              </p>

              <!-- Data table with green accent -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid #bbf7d0;">
                    <span style="font-size:12px;color:#15803d;">Plan</span>
                    <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#166534;">${params.planName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid #bbf7d0;">
                    <span style="font-size:12px;color:#15803d;">Monto de inversión</span>
                    <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#166534;">${formatCurrency(params.amount)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;">
                    <span style="font-size:12px;color:#15803d;">Fecha de firma</span>
                    <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#166534;">${signedDate}</p>
                  </td>
                </tr>
              </table>

              <div style="margin-top:28px;text-align:center;">
                <a href="${params.portalUrl}" style="display:inline-block;padding:14px 32px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
                  Ver contrato firmado
                </a>
              </div>
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
    from: EMAIL_FROM.contratos,
    to: params.to,
    subject: 'Contrato firmado exitosamente',
    html,
  })

  return { success: true, data: result }
}
