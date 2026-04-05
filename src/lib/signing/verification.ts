import { createAdminClient } from '@/lib/supabase/server'
import { sendVerificationCodeEmail } from '@/lib/email/verification-code-email'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateCodeResult {
  success: boolean
  masked_email: string
  error?: string
}

interface ValidateCodeResult {
  valid: boolean
  error?: 'CODE_EXPIRED' | 'MAX_ATTEMPTS' | 'INVALID_CODE' | 'NO_CODE'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Masks an email: `email@domain.com` -> `em***@domain.com` */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***@***'
  const visible = local.slice(0, 2)
  return `${visible}***@${domain}`
}

const MAX_CODES_PER_HOUR = 5
const MAX_ATTEMPTS = 3
const CODE_TTL_MINUTES = 10

// ---------------------------------------------------------------------------
// createAndSendCode
// ---------------------------------------------------------------------------

export async function createAndSendCode(
  contractInvestorId: string,
  recipientEmail: string,
  investorName: string,
): Promise<CreateCodeResult> {
  const supabase = await createAdminClient()
  const masked = maskEmail(recipientEmail)

  // 1. Rate limit: max 5 codes per hour for this contract_investor_id
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count, error: countError } = await supabase
    .from('verification_codes')
    .select('*', { count: 'exact', head: true })
    .eq('contract_investor_id', contractInvestorId)
    .gte('created_at', oneHourAgo)

  if (countError) {
    console.error('[verification] Error checking rate limit:', countError)
    return { success: false, masked_email: masked, error: 'Error interno al verificar limite de envios' }
  }

  if ((count ?? 0) >= MAX_CODES_PER_HOUR) {
    return {
      success: false,
      masked_email: masked,
      error: 'Se ha excedido el limite de codigos por hora. Intente mas tarde.',
    }
  }

  // 2. Invalidate previous unused codes
  const { error: invalidateError } = await supabase
    .from('verification_codes')
    .update({ used: true })
    .eq('contract_investor_id', contractInvestorId)
    .eq('used', false)

  if (invalidateError) {
    console.error('[verification] Error invalidating previous codes:', invalidateError)
    // Non-blocking — continue
  }

  // 3. Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString()

  // 4. Insert code with 10-minute expiration
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString()

  const { error: insertError } = await supabase.from('verification_codes').insert({
    contract_investor_id: contractInvestorId,
    code,
    expires_at: expiresAt,
  })

  if (insertError) {
    console.error('[verification] Error inserting code:', insertError)
    return { success: false, masked_email: masked, error: 'Error interno al generar codigo' }
  }

  // 5. Send code via email
  try {
    await sendVerificationCodeEmail({
      to: recipientEmail,
      investorName,
      code,
    })
  } catch (emailError) {
    console.error('[verification] Error sending email:', emailError)
    return { success: false, masked_email: masked, error: 'Error al enviar el correo de verificacion' }
  }

  return { success: true, masked_email: masked }
}

// ---------------------------------------------------------------------------
// validateCode
// ---------------------------------------------------------------------------

export async function validateCode(
  contractInvestorId: string,
  inputCode: string,
): Promise<ValidateCodeResult> {
  const supabase = await createAdminClient()

  // 1. Find the most recent unused code for this contract_investor_id
  const { data: codeRecord, error: fetchError } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('contract_investor_id', contractInvestorId)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (fetchError || !codeRecord) {
    return { valid: false, error: 'NO_CODE' }
  }

  // 2. Check expiration
  if (new Date(codeRecord.expires_at) < new Date()) {
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', codeRecord.id)

    return { valid: false, error: 'CODE_EXPIRED' }
  }

  // 3. Check max attempts
  if (codeRecord.attempts >= MAX_ATTEMPTS) {
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', codeRecord.id)

    return { valid: false, error: 'MAX_ATTEMPTS' }
  }

  // 4. Check code match
  if (codeRecord.code !== inputCode) {
    await supabase
      .from('verification_codes')
      .update({ attempts: codeRecord.attempts + 1 })
      .eq('id', codeRecord.id)

    return { valid: false, error: 'INVALID_CODE' }
  }

  // 5. Code is correct — mark as used
  await supabase
    .from('verification_codes')
    .update({ used: true })
    .eq('id', codeRecord.id)

  return { valid: true }
}
