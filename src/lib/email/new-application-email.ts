import { Resend } from 'resend'

interface SendNewApplicationParams {
  to: string[]
  investorName: string
  planName: string
  amount: number
  contractId: string
  dashboardUrl: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export async function sendNewApplicationEmail(params: SendNewApplicationParams) {
  const isLocalhost = process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')

  if (isLocalhost) {
    console.log('[DEV] Nueva solicitud externa:', {
      to: params.to,
      investor: params.investorName,
      plan: params.planName,
      amount: params.amount,
    })
    return { success: true, dev: true }
  }

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
        <tr><td style="padding:32px 40px 24px;border-bottom:1px solid #f4f4f5;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#18181b;">Grandir CM</p>
          <p style="margin:4px 0 0;font-size:13px;color:#71717a;">Nueva solicitud de inversión</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6;">
            Se recibió una nueva solicitud de inversión a través del formulario público.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9fb;border-radius:8px;border:1px solid #e4e4e7;">
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e4e4e7;">
              <span style="font-size:12px;color:#71717a;">Inversionista</span>
              <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#18181b;">${params.investorName}</p>
            </td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e4e4e7;">
              <span style="font-size:12px;color:#71717a;">Plan</span>
              <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#18181b;">${params.planName}</p>
            </td></tr>
            <tr><td style="padding:14px 20px;">
              <span style="font-size:12px;color:#71717a;">Monto solicitado</span>
              <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#18181b;">${formatCurrency(params.amount)}</p>
            </td></tr>
          </table>
          <div style="margin-top:28px;text-align:center;">
            <a href="${params.dashboardUrl}" style="display:inline-block;padding:14px 32px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
              Revisar solicitud
            </a>
          </div>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #f4f4f5;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
            Revisa la solicitud en el dashboard y continúa el proceso según corresponda.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

  const resend = new Resend(process.env.RESEND_API_KEY)
  const result = await resend.emails.send({
    from: 'Grandir CM <sistema@grandir.com>',
    to: params.to,
    subject: `Nueva solicitud: ${params.investorName} — ${params.planName}`,
    html,
  })

  return { success: true, data: result }
}
