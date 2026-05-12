import { Resend } from 'resend'
import { EMAIL_FROM } from './config'

interface SendBulletinEmailParams {
  to: string
  investorName: string
  subject: string
  body: string
}

export async function sendBulletinEmail(params: SendBulletinEmailParams) {
  const isLocalhost = process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')

  if (isLocalhost) {
    console.log('[DEV] Boletín no enviado (modo test):', {
      to: params.to,
      investor: params.investorName,
      subject: params.subject,
    })
    return { success: true, dev: true }
  }

  const bodyHtml = params.body
    .split('\n')
    .map((line) => (line.trim() ? `<p style="margin:0 0 12px;font-size:14px;color:#3f3f46;line-height:1.6;">${line}</p>` : '<br/>'))
    .join('')

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${params.subject}</title>
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
              <p style="margin:4px 0 0;font-size:13px;color:#71717a;">Comunicado</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 24px;font-size:14px;color:#52525b;">
                Estimado/a <strong style="color:#18181b;">${params.investorName}</strong>,
              </p>
              <div>${bodyHtml}</div>
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
    from: EMAIL_FROM.comunicados,
    to: params.to,
    subject: params.subject,
    html,
  })

  return { success: true, data: result }
}
