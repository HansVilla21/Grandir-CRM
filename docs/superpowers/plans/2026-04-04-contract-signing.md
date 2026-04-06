# Contract Signing System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar firma electrónica de contratos con verificación por código email, audit trail y generación de PDF firmado.

**Architecture:** El flujo extiende el portal existente: al enviar a aprobación se genera el PDF del contrato y se notifica al inversionista. En el portal, un flujo de 3 pasos (identidad → código → confirmación) reemplaza el botón de aprobar actual. Al firmar, se genera un PDF con certificado de firma y se notifica a ambas partes.

**Tech Stack:** Next.js 16 (App Router), Supabase (PostgreSQL + Storage), Resend (emails), @react-pdf/renderer (PDFs), TypeScript.

**Spec:** `docs/superpowers/specs/2026-04-04-contract-signing-design.md`

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `supabase/migrations/XXXX_contract_signing.sql` | Migración: campos de firma, tabla verification_codes, tabla contract_templates |
| `src/types/signing.ts` | Types del sistema de firma |
| `src/lib/pdf/contract-templates/base-template.tsx` | Template base compartido para PDFs de contrato |
| `src/lib/pdf/contract-templates/signature-page.tsx` | Página de certificado de firma |
| `src/lib/pdf/generate-contract-pdf.ts` | Lógica de generación de PDF (contrato + firma) |
| `src/lib/email/contract-invitation-email.ts` | Email: invitación a firmar |
| `src/lib/email/verification-code-email.ts` | Email: código de verificación |
| `src/lib/email/signing-confirmation-email.ts` | Email: confirmación de firma |
| `src/lib/email/signing-notification-email.ts` | Email: notificación al admin |
| `src/lib/signing/verification.ts` | Lógica de generación y validación de códigos |
| `src/app/api/portal/[token]/request-code/route.ts` | API: solicitar código de verificación |
| `src/app/api/portal/[token]/sign/route.ts` | API: firmar contrato |
| `src/app/(portal)/portal/[token]/_components/signing-flow.tsx` | UI: flujo de firma completo (3 pasos) |

### Modified files
| File | Change |
|------|--------|
| `src/types/database.ts` | Agregar campos de firma a contract_investors, tipos para verification_codes y contract_templates |
| `src/types/portal.ts` | Agregar campos de firma a PortalContractInvestor |
| `src/app/api/contracts/[id]/route.ts` | En transición a pending_approval: generar tokens, PDF y enviar email |
| `src/app/api/portal/[token]/route.ts` | Incluir datos de firma y URL del PDF firmado en response |
| `src/app/(portal)/portal/[token]/_components/portal-contract-view.tsx` | Reemplazar botones aprobar/revisión por SigningFlow |
| `src/app/(dashboard)/dashboard/contracts/[id]/page.tsx` | Mostrar estado de firma, botón copiar link, reenviar invitación |
| `src/app/(dashboard)/dashboard/contracts/_components/contract-actions.tsx` | Agregar botón "Copiar link del portal" |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260404120000_contract_signing.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Campos de firma en contract_investors
ALTER TABLE contract_investors ADD COLUMN IF NOT EXISTS signature_name text;
ALTER TABLE contract_investors ADD COLUMN IF NOT EXISTS signature_cedula text;
ALTER TABLE contract_investors ADD COLUMN IF NOT EXISTS signature_ip text;
ALTER TABLE contract_investors ADD COLUMN IF NOT EXISTS signature_user_agent text;
ALTER TABLE contract_investors ADD COLUMN IF NOT EXISTS signed_at timestamptz;

-- Tabla de códigos de verificación
CREATE TABLE IF NOT EXISTS verification_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_investor_id uuid NOT NULL REFERENCES contract_investors(id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int DEFAULT 0,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- Solo accesible via service role (API routes usan createAdminClient)
CREATE POLICY "Service role full access on verification_codes"
  ON verification_codes FOR ALL
  USING (auth.role() = 'service_role');

-- Tabla de templates de contrato
CREATE TABLE IF NOT EXISTS contract_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES investment_plans(id),
  name text NOT NULL,
  version int DEFAULT 1,
  content text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on contract_templates"
  ON contract_templates FOR ALL
  USING (auth.role() = 'service_role');

-- Índice para búsqueda rápida de códigos no usados
CREATE INDEX idx_verification_codes_ci_id ON verification_codes(contract_investor_id) WHERE NOT used;

-- Índice para buscar template activo por plan
CREATE INDEX idx_contract_templates_plan_active ON contract_templates(plan_id) WHERE active;
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Run: `mcp__supabase__apply_migration` with name `contract_signing` and the SQL above.

- [ ] **Step 3: Verify tables exist**

Run: `mcp__supabase__list_tables` and confirm `verification_codes` and `contract_templates` appear.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260404120000_contract_signing.sql
git commit -m "feat: migración para sistema de firma electrónica"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/types/signing.ts`
- Modify: `src/types/database.ts`
- Modify: `src/types/portal.ts`

- [ ] **Step 1: Create signing types**

Create `src/types/signing.ts`:

```typescript
export interface SignatureData {
  signature_name: string
  signature_cedula: string
  signature_ip: string
  signature_user_agent: string
  signed_at: string
}

export interface VerificationCode {
  id: string
  contract_investor_id: string
  code: string
  expires_at: string
  attempts: number
  used: boolean
  created_at: string
}

export interface ContractTemplate {
  id: string
  plan_id: string
  name: string
  version: number
  content: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface ContractPdfData {
  investor_name: string
  investor_cedula: string
  amount: number
  term_months: number
  start_date: string
  end_date: string | null
  annual_rate: number
  plan_name: string
  plan_type: string
  contract_id: string
}

export interface SignatureCertificateData {
  signer_name: string
  signer_cedula: string
  signed_at: string
  ip_address: string
  document_hash: string
}

export type SigningStep = 'identity' | 'verification' | 'confirmation' | 'success'
```

- [ ] **Step 2: Update database.ts — add signature fields to contract_investors Row type**

In `src/types/database.ts`, find the `contract_investors` Row type and add after `approved_at`:

```typescript
signature_name: string | null
signature_cedula: string | null
signature_ip: string | null
signature_user_agent: string | null
signed_at: string | null
```

Do the same for the Insert and Update types (as optional fields).

Add new table types for `verification_codes` and `contract_templates` following the same pattern as existing tables.

- [ ] **Step 3: Update portal.ts — add signature fields to PortalContractInvestor**

In `src/types/portal.ts`, add to the `PortalContractInvestor` interface:

```typescript
signed_at: string | null
signature_name: string | null
```

- [ ] **Step 4: Commit**

```bash
git add src/types/signing.ts src/types/database.ts src/types/portal.ts
git commit -m "feat: types para sistema de firma electrónica"
```

---

## Task 3: Install @react-pdf/renderer

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dependency**

```bash
npm install @react-pdf/renderer
```

- [ ] **Step 2: Verify installation**

```bash
npx tsc --noEmit 2>&1 | head -5
```

Expected: No new type errors related to @react-pdf/renderer.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: instalar @react-pdf/renderer para generación de PDFs"
```

---

## Task 4: Verification Code Service

**Files:**
- Create: `src/lib/signing/verification.ts`

- [ ] **Step 1: Create the verification module**

Create `src/lib/signing/verification.ts`:

```typescript
import { createAdminClient } from '@/lib/supabase/server'
import { sendVerificationCodeEmail } from '@/lib/email/verification-code-email'

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local[0]}${local[1]}***@${domain}`
}

export async function createAndSendCode(
  contractInvestorId: string,
  recipientEmail: string,
  investorName: string
): Promise<{ success: boolean; masked_email: string; error?: string }> {
  const supabase = await createAdminClient()

  // Invalidar códigos previos no usados
  await supabase
    .from('verification_codes')
    .update({ used: true })
    .eq('contract_investor_id', contractInvestorId)
    .eq('used', false)

  // Rate limit: máximo 5 códigos por hora
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('verification_codes')
    .select('*', { count: 'exact', head: true })
    .eq('contract_investor_id', contractInvestorId)
    .gte('created_at', oneHourAgo)

  if ((count ?? 0) >= 5) {
    return { success: false, masked_email: maskEmail(recipientEmail), error: 'RATE_LIMIT' }
  }

  const code = generateCode()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min

  const { error: insertError } = await supabase
    .from('verification_codes')
    .insert({
      contract_investor_id: contractInvestorId,
      code,
      expires_at: expiresAt,
    })

  if (insertError) {
    return { success: false, masked_email: maskEmail(recipientEmail), error: 'INSERT_FAILED' }
  }

  await sendVerificationCodeEmail({
    to: [recipientEmail],
    code,
    investorName,
  })

  return { success: true, masked_email: maskEmail(recipientEmail) }
}

export async function validateCode(
  contractInvestorId: string,
  inputCode: string
): Promise<{ valid: boolean; error?: string }> {
  const supabase = await createAdminClient()

  // Buscar código activo más reciente
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

  // Verificar expiración
  if (new Date(codeRecord.expires_at) < new Date()) {
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', codeRecord.id)
    return { valid: false, error: 'CODE_EXPIRED' }
  }

  // Verificar intentos
  if (codeRecord.attempts >= 3) {
    await supabase
      .from('verification_codes')
      .update({ used: true })
      .eq('id', codeRecord.id)
    return { valid: false, error: 'MAX_ATTEMPTS' }
  }

  // Verificar código
  if (codeRecord.code !== inputCode) {
    await supabase
      .from('verification_codes')
      .update({ attempts: codeRecord.attempts + 1 })
      .eq('id', codeRecord.id)
    return { valid: false, error: 'INVALID_CODE' }
  }

  // Marcar como usado
  await supabase
    .from('verification_codes')
    .update({ used: true })
    .eq('id', codeRecord.id)

  return { valid: true }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/signing/verification.ts
git commit -m "feat: servicio de generación y validación de códigos de verificación"
```

---

## Task 5: Email Templates

**Files:**
- Create: `src/lib/email/contract-invitation-email.ts`
- Create: `src/lib/email/verification-code-email.ts`
- Create: `src/lib/email/signing-confirmation-email.ts`
- Create: `src/lib/email/signing-notification-email.ts`

- [ ] **Step 1: Create invitation email**

Create `src/lib/email/contract-invitation-email.ts`. Follow the exact pattern from `report-email.ts`:
- Check `NEXT_PUBLIC_APP_URL?.includes('localhost')` for dev mode
- Use Resend API
- HTML email template with Grandir CM branding

```typescript
import { Resend } from 'resend'

interface SendContractInvitationParams {
  to: string[]
  investorName: string
  planName: string
  amount: number
  termMonths: number
  portalUrl: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export async function sendContractInvitationEmail(params: SendContractInvitationParams) {
  const isLocalhost = process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')

  if (isLocalhost) {
    console.log('[DEV] Email de invitación no enviado (modo test):', {
      to: params.to,
      investor: params.investorName,
      plan: params.planName,
      portalUrl: params.portalUrl,
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
          <p style="margin:4px 0 0;font-size:13px;color:#71717a;">Contrato de inversión</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 24px;font-size:14px;color:#52525b;">
            Estimado/a <strong style="color:#18181b;">${params.investorName}</strong>,
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6;">
            Tu contrato de inversión está listo para revisar y firmar.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9fb;border-radius:8px;border:1px solid #e4e4e7;">
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e4e4e7;">
              <span style="font-size:12px;color:#71717a;">Plan</span>
              <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#18181b;">${params.planName}</p>
            </td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e4e4e7;">
              <span style="font-size:12px;color:#71717a;">Monto de inversión</span>
              <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#18181b;">${formatCurrency(params.amount)}</p>
            </td></tr>
            <tr><td style="padding:14px 20px;">
              <span style="font-size:12px;color:#71717a;">Plazo</span>
              <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#18181b;">${params.termMonths} mes${params.termMonths !== 1 ? 'es' : ''}</p>
            </td></tr>
          </table>
          <div style="margin-top:28px;text-align:center;">
            <a href="${params.portalUrl}" style="display:inline-block;padding:14px 32px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
              Revisar y firmar contrato
            </a>
          </div>
          <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;text-align:center;">
            Si no reconoces esta solicitud, puedes ignorar este mensaje.
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #f4f4f5;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
            Este correo fue enviado por Grandir CM. Para consultas, responda a este mensaje.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

  const resend = new Resend(process.env.RESEND_API_KEY)
  const result = await resend.emails.send({
    from: 'Grandir CM <contratos@grandir.com>',
    to: params.to,
    subject: 'Tu contrato de inversión está listo para firmar',
    html,
  })

  return { success: true, data: result }
}
```

- [ ] **Step 2: Create verification code email**

Create `src/lib/email/verification-code-email.ts`:

```typescript
import { Resend } from 'resend'

interface SendVerificationCodeParams {
  to: string[]
  code: string
  investorName: string
}

export async function sendVerificationCodeEmail(params: SendVerificationCodeParams) {
  const isLocalhost = process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')

  if (isLocalhost) {
    console.log('[DEV] Código de verificación:', {
      to: params.to,
      code: params.code,
      investor: params.investorName,
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
          <p style="margin:4px 0 0;font-size:13px;color:#71717a;">Verificación de identidad</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 24px;font-size:14px;color:#52525b;">
            Hola <strong style="color:#18181b;">${params.investorName}</strong>,
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6;">
            Tu código de verificación para firmar el contrato es:
          </p>
          <div style="text-align:center;margin:24px 0;">
            <span style="display:inline-block;padding:16px 32px;background:#f4f4f5;border-radius:12px;font-size:32px;font-weight:700;letter-spacing:8px;color:#18181b;border:1px solid #e4e4e7;">
              ${params.code}
            </span>
          </div>
          <p style="margin:24px 0 0;font-size:13px;color:#71717a;text-align:center;line-height:1.6;">
            Este código expira en <strong>10 minutos</strong>.<br/>
            Si no solicitaste este código, puedes ignorar este mensaje.
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #f4f4f5;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
            Por tu seguridad, nunca compartas este código con nadie.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

  const resend = new Resend(process.env.RESEND_API_KEY)
  const result = await resend.emails.send({
    from: 'Grandir CM <seguridad@grandir.com>',
    to: params.to,
    subject: `Tu código de verificación: ${params.code}`,
    html,
  })

  return { success: true, data: result }
}
```

- [ ] **Step 3: Create signing confirmation email**

Create `src/lib/email/signing-confirmation-email.ts`:

```typescript
import { Resend } from 'resend'

interface SendSigningConfirmationParams {
  to: string[]
  investorName: string
  planName: string
  amount: number
  signedAt: string
  portalUrl: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dateStr))
}

export async function sendSigningConfirmationEmail(params: SendSigningConfirmationParams) {
  const isLocalhost = process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')

  if (isLocalhost) {
    console.log('[DEV] Email de confirmación de firma:', {
      to: params.to,
      investor: params.investorName,
      signedAt: params.signedAt,
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
          <p style="margin:4px 0 0;font-size:13px;color:#71717a;">Confirmación de firma</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 24px;font-size:14px;color:#52525b;">
            Estimado/a <strong style="color:#18181b;">${params.investorName}</strong>,
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6;">
            Tu contrato ha sido firmado exitosamente.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;">
            <tr><td style="padding:14px 20px;border-bottom:1px solid #bbf7d0;">
              <span style="font-size:12px;color:#15803d;">Plan</span>
              <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#14532d;">${params.planName}</p>
            </td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #bbf7d0;">
              <span style="font-size:12px;color:#15803d;">Monto</span>
              <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#14532d;">${formatCurrency(params.amount)}</p>
            </td></tr>
            <tr><td style="padding:14px 20px;">
              <span style="font-size:12px;color:#15803d;">Firmado el</span>
              <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#14532d;">${formatDateTime(params.signedAt)}</p>
            </td></tr>
          </table>
          <div style="margin-top:28px;text-align:center;">
            <a href="${params.portalUrl}" style="display:inline-block;padding:14px 32px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
              Ver contrato firmado
            </a>
          </div>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #f4f4f5;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
            Conserva este correo como comprobante de tu firma electrónica.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

  const resend = new Resend(process.env.RESEND_API_KEY)
  const result = await resend.emails.send({
    from: 'Grandir CM <contratos@grandir.com>',
    to: params.to,
    subject: 'Contrato firmado exitosamente',
    html,
  })

  return { success: true, data: result }
}
```

- [ ] **Step 4: Create admin notification email**

Create `src/lib/email/signing-notification-email.ts`:

```typescript
import { Resend } from 'resend'

interface SendSigningNotificationParams {
  to: string[]
  investorName: string
  contractId: string
  planName: string
  amount: number
  signedAt: string
  dashboardUrl: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dateStr))
}

export async function sendSigningNotificationEmail(params: SendSigningNotificationParams) {
  const isLocalhost = process.env.NEXT_PUBLIC_APP_URL?.includes('localhost')

  if (isLocalhost) {
    console.log('[DEV] Notificación al admin de firma:', {
      to: params.to,
      investor: params.investorName,
      contract: params.contractId,
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
          <p style="margin:4px 0 0;font-size:13px;color:#71717a;">Notificación del sistema</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.6;">
            El inversionista <strong style="color:#18181b;">${params.investorName}</strong> ha firmado el contrato
            <strong style="color:#18181b;">#${params.contractId.slice(0, 8).toUpperCase()}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9fb;border-radius:8px;border:1px solid #e4e4e7;">
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e4e4e7;">
              <span style="font-size:12px;color:#71717a;">Plan</span>
              <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#18181b;">${params.planName}</p>
            </td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e4e4e7;">
              <span style="font-size:12px;color:#71717a;">Monto</span>
              <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#18181b;">${formatCurrency(params.amount)}</p>
            </td></tr>
            <tr><td style="padding:14px 20px;">
              <span style="font-size:12px;color:#71717a;">Firmado el</span>
              <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#18181b;">${formatDateTime(params.signedAt)}</p>
            </td></tr>
          </table>
          <div style="margin-top:28px;text-align:center;">
            <a href="${params.dashboardUrl}" style="display:inline-block;padding:14px 32px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
              Ver contrato
            </a>
          </div>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #f4f4f5;">
          <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
            Revisa el contrato y actívalo cuando estés listo.
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
    subject: `${params.investorName} firmó el contrato #${params.contractId.slice(0, 8).toUpperCase()}`,
    html,
  })

  return { success: true, data: result }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/contract-invitation-email.ts src/lib/email/verification-code-email.ts src/lib/email/signing-confirmation-email.ts src/lib/email/signing-notification-email.ts
git commit -m "feat: templates de email para firma electrónica (invitación, código, confirmación, notificación)"
```

---

## Task 6: PDF Generation — Contract Template + Signature Page

**Files:**
- Create: `src/lib/pdf/contract-templates/base-template.tsx`
- Create: `src/lib/pdf/contract-templates/signature-page.tsx`
- Create: `src/lib/pdf/generate-contract-pdf.ts`

- [ ] **Step 1: Create base contract template**

Create `src/lib/pdf/contract-templates/base-template.tsx`:

This is a **placeholder template** that generates a professional-looking contract PDF using `@react-pdf/renderer`. April will provide the real contract text later — this template has the structure and dynamic variables in place.

```tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ContractPdfData } from '@/types/signing'

const styles = StyleSheet.create({
  page: { padding: 60, fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.6 },
  header: { textAlign: 'center', marginBottom: 40 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 12, color: '#555' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 8, borderBottom: '1 solid #ddd', paddingBottom: 4 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: '40%', fontWeight: 'bold', color: '#333' },
  value: { width: '60%', color: '#111' },
  paragraph: { marginBottom: 12, textAlign: 'justify' },
  footer: { position: 'absolute', bottom: 40, left: 60, right: 60, textAlign: 'center', fontSize: 9, color: '#999' },
})

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'long' }).format(new Date(dateStr))
}

const PLAN_LABELS: Record<string, string> = {
  annual: 'Anual',
  monthly: 'Mensual',
  semestral: 'Semestral',
}

export function ContractDocument({ data }: { data: ContractPdfData }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>CONTRATO DE INVERSIÓN</Text>
          <Text style={styles.subtitle}>Grandir CM Sociedad de Responsabilidad Limitada</Text>
          <Text style={styles.subtitle}>Cédula jurídica: 3-102-873916</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del Inversionista</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre completo:</Text>
            <Text style={styles.value}>{data.investor_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cédula:</Text>
            <Text style={styles.value}>{data.investor_cedula}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del Contrato</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Contrato N°:</Text>
            <Text style={styles.value}>#{data.contract_id.slice(0, 8).toUpperCase()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Plan de inversión:</Text>
            <Text style={styles.value}>{data.plan_name} ({PLAN_LABELS[data.plan_type] ?? data.plan_type})</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Monto de inversión:</Text>
            <Text style={styles.value}>{formatCurrency(data.amount)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tasa de rendimiento:</Text>
            <Text style={styles.value}>{data.annual_rate}% anual</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Plazo:</Text>
            <Text style={styles.value}>{data.term_months} mes{data.term_months !== 1 ? 'es' : ''}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fecha de inicio:</Text>
            <Text style={styles.value}>{formatDate(data.start_date)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fecha de vencimiento:</Text>
            <Text style={styles.value}>{formatDate(data.end_date)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Términos y Condiciones</Text>
          <Text style={styles.paragraph}>
            Por medio del presente contrato, el inversionista acepta los términos y condiciones
            del plan de inversión {data.plan_name} ofrecido por Grandir CM S.R.L. El inversionista
            deposita la suma de {formatCurrency(data.amount)} por un plazo de {data.term_months} mes{data.term_months !== 1 ? 'es' : ''}, con
            un rendimiento del {data.annual_rate}% anual.
          </Text>
          <Text style={styles.paragraph}>
            Grandir CM se compromete a administrar los fondos de acuerdo con las políticas
            de inversión establecidas y a generar reportes periódicos sobre el estado de la
            inversión. El inversionista recibirá los rendimientos según la estructura de pago
            del plan seleccionado.
          </Text>
          <Text style={styles.paragraph}>
            Este contrato se rige por las leyes de la República de Costa Rica. Cualquier
            controversia será resuelta conforme a los mecanismos de resolución alternativa
            de conflictos vigentes.
          </Text>
        </View>

        <Text style={styles.footer}>
          Grandir CM S.R.L. — Cédula jurídica 3-102-873916 — Costa Rica
        </Text>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: Create signature certificate page**

Create `src/lib/pdf/contract-templates/signature-page.tsx`:

```tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { SignatureCertificateData } from '@/types/signing'

const styles = StyleSheet.create({
  page: { padding: 60, fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.6 },
  container: { border: '2 solid #18181b', borderRadius: 8, padding: 30, marginTop: 40 },
  title: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  divider: { borderBottom: '1 solid #e4e4e7', marginVertical: 16 },
  row: { flexDirection: 'row', marginBottom: 8 },
  label: { width: '35%', fontWeight: 'bold', fontSize: 10, color: '#71717a' },
  value: { width: '65%', fontSize: 11, color: '#18181b' },
  legalText: { marginTop: 24, fontSize: 9, color: '#71717a', textAlign: 'justify', lineHeight: 1.5 },
  hash: { marginTop: 16, fontSize: 8, color: '#a1a1aa', fontFamily: 'Courier', textAlign: 'center' },
  footer: { position: 'absolute', bottom: 40, left: 60, right: 60, textAlign: 'center', fontSize: 9, color: '#999' },
})

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('es-CR', {
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(new Date(dateStr))
}

export function SignatureCertificatePage({ data }: { data: SignatureCertificateData }) {
  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.container}>
        <Text style={styles.title}>CERTIFICADO DE FIRMA ELECTRÓNICA</Text>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>FIRMANTE:</Text>
          <Text style={styles.value}>{data.signer_name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>CÉDULA:</Text>
          <Text style={styles.value}>{data.signer_cedula}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>FECHA Y HORA:</Text>
          <Text style={styles.value}>{formatDateTime(data.signed_at)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>DIRECCIÓN IP:</Text>
          <Text style={styles.value}>{data.ip_address}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.legalText}>
          Este documento fue firmado electrónicamente de acuerdo con la Ley N° 8454
          de Certificados, Firmas Digitales y Documentos Electrónicos de la República
          de Costa Rica. La firma electrónica tiene la misma validez y eficacia probatoria
          que la firma manuscrita.
        </Text>
        <Text style={styles.legalText}>
          El firmante declaró haber leído y aceptado todos los términos y condiciones
          del contrato mediante verificación de identidad (nombre y cédula) y código
          de verificación enviado a su correo electrónico registrado.
        </Text>

        <Text style={styles.hash}>
          Hash de verificación (SHA-256): {data.document_hash}
        </Text>
      </View>

      <Text style={styles.footer}>
        Grandir CM S.R.L. — Cédula jurídica 3-102-873916 — Costa Rica
      </Text>
    </Page>
  )
}
```

- [ ] **Step 3: Create PDF generation logic**

Create `src/lib/pdf/generate-contract-pdf.ts`:

```typescript
import { renderToBuffer } from '@react-pdf/renderer'
import { Document } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createHash } from 'crypto'
import { ContractDocument } from './contract-templates/base-template'
import { SignatureCertificatePage } from './contract-templates/signature-page'
import type { ContractPdfData, SignatureCertificateData } from '@/types/signing'

export async function generateContractPdf(data: ContractPdfData): Promise<Buffer> {
  const element = createElement(ContractDocument, { data })
  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}

export async function generateSignedContractPdf(
  contractData: ContractPdfData,
  signatureData: SignatureCertificateData
): Promise<Buffer> {
  // Generate contract pages + signature certificate as a single document
  const element = createElement(Document, null,
    // Contract pages (from base template, but as raw pages)
    createElement(ContractDocument, { data: contractData }).props.children,
    // Signature certificate page
    createElement(SignatureCertificatePage, { data: signatureData })
  )

  const buffer = await renderToBuffer(element)
  return Buffer.from(buffer)
}

export function computeDocumentHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}
```

Note: The `generateSignedContractPdf` approach of composing Document children may need adjustment based on how `@react-pdf/renderer` handles nested Document components. If it doesn't work, the fallback is to generate contract PDF separately, then use a PDF merging library to append the signature page. Test this in Step 4.

- [ ] **Step 4: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Fix any type errors. Common issues: `@react-pdf/renderer` may need `@types/react` alignment or the `renderToBuffer` import path may differ.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf/
git commit -m "feat: generación de PDF de contrato y certificado de firma"
```

---

## Task 7: API Route — Request Verification Code

**Files:**
- Create: `src/app/api/portal/[token]/request-code/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/portal/[token]/request-code/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createAndSendCode } from '@/lib/signing/verification'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    const body = await request.json()
    const { name, cedula } = body as { name?: string; cedula?: string }

    if (!name?.trim() || !cedula?.trim()) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: 'Nombre y cédula son requeridos.' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // 1. Validar token
    const { data: ci, error: ciError } = await supabase
      .from('contract_investors')
      .select('id, contract_id, investor_id, approval_status, token_expires_at')
      .eq('portal_token', token)
      .single()

    if (ciError || !ci) {
      return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 404 })
    }

    if (ci.token_expires_at && new Date(ci.token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 404 })
    }

    if (ci.approval_status !== 'pending') {
      return NextResponse.json(
        { error: 'ALREADY_PROCESSED', message: 'Este contrato ya fue firmado.' },
        { status: 400 }
      )
    }

    // 2. Obtener datos del inversionista para validar identidad
    const { data: investor } = await supabase
      .from('investors')
      .select('full_name, cedula')
      .eq('id', ci.investor_id)
      .single()

    if (!investor) {
      return NextResponse.json({ error: 'INVESTOR_NOT_FOUND' }, { status: 404 })
    }

    // 3. Validar nombre y cédula (normalizar: sin acentos, lowercase, sin espacios extra)
    const normalize = (s: string) =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

    const nameMatch = normalize(name) === normalize(investor.full_name)
    const cedulaClean = (s: string) => s.replace(/\D/g, '')
    const cedulaMatch = cedulaClean(cedula) === cedulaClean(investor.cedula)

    if (!nameMatch || !cedulaMatch) {
      return NextResponse.json(
        { error: 'IDENTITY_MISMATCH', message: 'Los datos no coinciden con los registrados.' },
        { status: 422 }
      )
    }

    // 4. Obtener email primario del inversionista
    const { data: emails } = await supabase
      .from('investor_emails')
      .select('email')
      .eq('investor_id', ci.investor_id)
      .eq('is_primary', true)
      .limit(1)

    const primaryEmail = emails?.[0]?.email
    if (!primaryEmail) {
      return NextResponse.json(
        { error: 'NO_EMAIL', message: 'No se encontró un email registrado.' },
        { status: 422 }
      )
    }

    // 5. Generar y enviar código
    const result = await createAndSendCode(ci.id, primaryEmail, investor.full_name)

    if (!result.success) {
      if (result.error === 'RATE_LIMIT') {
        return NextResponse.json(
          { error: 'RATE_LIMIT', message: 'Demasiados intentos. Intenta de nuevo en una hora.' },
          { status: 429 }
        )
      }
      return NextResponse.json({ error: 'CODE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      masked_email: result.masked_email,
    })
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/portal/[token]/request-code/route.ts
git commit -m "feat: API endpoint para solicitar código de verificación"
```

---

## Task 8: API Route — Sign Contract

**Files:**
- Create: `src/app/api/portal/[token]/sign/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/portal/[token]/sign/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateCode } from '@/lib/signing/verification'
import { generateSignedContractPdf, computeDocumentHash, generateContractPdf } from '@/lib/pdf/generate-contract-pdf'
import { sendSigningConfirmationEmail } from '@/lib/email/signing-confirmation-email'
import { sendSigningNotificationEmail } from '@/lib/email/signing-notification-email'
import type { ContractPdfData, SignatureCertificateData } from '@/types/signing'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    const body = await request.json()
    const { code } = body as { code?: string }

    if (!code?.trim()) {
      return NextResponse.json(
        { error: 'MISSING_CODE', message: 'El código de verificación es requerido.' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // 1. Validar token
    const { data: ci, error: ciError } = await supabase
      .from('contract_investors')
      .select('id, contract_id, investor_id, approval_status, token_expires_at')
      .eq('portal_token', token)
      .single()

    if (ciError || !ci) {
      return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 404 })
    }

    if (ci.token_expires_at && new Date(ci.token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'TOKEN_EXPIRED' }, { status: 404 })
    }

    if (ci.approval_status !== 'pending') {
      return NextResponse.json(
        { error: 'ALREADY_SIGNED', message: 'Este contrato ya fue firmado.' },
        { status: 400 }
      )
    }

    // 2. Validar código
    const codeResult = await validateCode(ci.id, code.trim())
    if (!codeResult.valid) {
      const messages: Record<string, string> = {
        NO_CODE: 'No hay un código activo. Solicita uno nuevo.',
        CODE_EXPIRED: 'El código ha expirado. Solicita uno nuevo.',
        MAX_ATTEMPTS: 'Demasiados intentos incorrectos. Solicita un nuevo código.',
        INVALID_CODE: 'Código incorrecto.',
      }
      return NextResponse.json(
        { error: codeResult.error, message: messages[codeResult.error ?? ''] ?? 'Error de verificación.' },
        { status: 422 }
      )
    }

    // 3. Obtener datos para la firma
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown'
    const userAgent = request.headers.get('user-agent') ?? 'unknown'
    const signedAt = new Date().toISOString()

    const { data: investor } = await supabase
      .from('investors')
      .select('full_name, cedula')
      .eq('id', ci.investor_id)
      .single()

    if (!investor) {
      return NextResponse.json({ error: 'INVESTOR_NOT_FOUND' }, { status: 404 })
    }

    // 4. Registrar firma
    const { error: signError } = await supabase
      .from('contract_investors')
      .update({
        approval_status: 'approved',
        approved_at: signedAt,
        signature_name: investor.full_name,
        signature_cedula: investor.cedula,
        signature_ip: ip,
        signature_user_agent: userAgent,
        signed_at: signedAt,
      })
      .eq('id', ci.id)

    if (signError) {
      return NextResponse.json({ error: 'SIGN_FAILED' }, { status: 500 })
    }

    // 5. Obtener datos del contrato para generar PDF firmado
    const { data: contract } = await supabase
      .from('contracts')
      .select('id, amount, term_months, start_date, end_date, plan_id, investment_plans(name, type, annual_rate)')
      .eq('id', ci.contract_id)
      .single()

    if (contract) {
      const plan = contract.investment_plans as { name: string; type: string; annual_rate: number } | null

      const contractPdfData: ContractPdfData = {
        investor_name: investor.full_name,
        investor_cedula: investor.cedula,
        amount: contract.amount,
        term_months: contract.term_months,
        start_date: contract.start_date ?? '',
        end_date: contract.end_date,
        annual_rate: plan?.annual_rate ?? 0,
        plan_name: plan?.name ?? '—',
        plan_type: plan?.type ?? 'annual',
        contract_id: contract.id,
      }

      // Generate unsigned PDF first to get hash
      const unsignedPdf = await generateContractPdf(contractPdfData)
      const documentHash = computeDocumentHash(unsignedPdf)

      const signatureCertData: SignatureCertificateData = {
        signer_name: investor.full_name,
        signer_cedula: investor.cedula,
        signed_at: signedAt,
        ip_address: ip,
        document_hash: documentHash,
      }

      // Generate signed PDF (contract + signature page)
      const signedPdf = await generateSignedContractPdf(contractPdfData, signatureCertData)

      // Upload to Supabase Storage
      const storagePath = `${contract.id}/signed_${Date.now()}.pdf`
      await supabase.storage
        .from('contracts')
        .upload(storagePath, signedPdf, {
          contentType: 'application/pdf',
          upsert: false,
        })

      // Create document record
      await supabase
        .from('contract_documents')
        .insert({
          contract_id: contract.id,
          type: 'signed_contract',
          file_name: `contrato-firmado-${contract.id.slice(0, 8)}.pdf`,
          storage_path: storagePath,
          file_size: signedPdf.length,
          mime_type: 'application/pdf',
          uploaded_by_portal: ci.id,
        })

      // 6. Send confirmation email to investor
      const { data: emails } = await supabase
        .from('investor_emails')
        .select('email')
        .eq('investor_id', ci.investor_id)
        .eq('is_primary', true)
        .limit(1)

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

      if (emails?.[0]?.email) {
        await sendSigningConfirmationEmail({
          to: [emails[0].email],
          investorName: investor.full_name,
          planName: plan?.name ?? '—',
          amount: contract.amount,
          signedAt,
          portalUrl: `${appUrl}/portal/${token}`,
        })
      }

      // 7. Send notification to admin(s)
      const { data: admins } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'admin')

      if (admins && admins.length > 0) {
        // Get admin emails from auth.users
        const adminEmails: string[] = []
        for (const admin of admins) {
          const { data: authUser } = await supabase.auth.admin.getUserById(admin.id)
          if (authUser?.user?.email) {
            adminEmails.push(authUser.user.email)
          }
        }

        if (adminEmails.length > 0) {
          await sendSigningNotificationEmail({
            to: adminEmails,
            investorName: investor.full_name,
            contractId: contract.id,
            planName: plan?.name ?? '—',
            amount: contract.amount,
            signedAt,
            dashboardUrl: `${appUrl}/dashboard/contracts/${contract.id}`,
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Sign error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/portal/[token]/sign/route.ts
git commit -m "feat: API endpoint para firmar contrato con certificado PDF"
```

---

## Task 9: Modify Contract PATCH — Send Invitation on pending_approval

**Files:**
- Modify: `src/app/api/contracts/[id]/route.ts`

- [ ] **Step 1: Add token generation + email sending when transitioning to pending_approval**

In `src/app/api/contracts/[id]/route.ts`, after the status is updated to `pending_approval` (around line 170, after `return NextResponse.json({ contract: updated })`), add logic BEFORE the return:

Replace the block from line 159 to 171 (the status update + return) with:

```typescript
      const { data: updated, error: updateError } = await supabase
        .from('contracts')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // When transitioning to pending_approval: generate tokens, generate PDF, send invitations
      if (newStatus === 'pending_approval') {
        const { sendContractInvitationEmail } = await import('@/lib/email/contract-invitation-email')
        const { generateContractPdf } = await import('@/lib/pdf/generate-contract-pdf')

        // Get contract investors that need tokens
        const { data: contractInvestors } = await supabase
          .from('contract_investors')
          .select('id, investor_id, portal_token')
          .eq('contract_id', id)

        // Get contract + plan for PDF and email
        const { data: contractWithPlan } = await supabase
          .from('contracts')
          .select('amount, term_months, start_date, end_date, investment_plans(name, type, annual_rate)')
          .eq('id', id)
          .single()

        const plan = contractWithPlan?.investment_plans as { name: string; type: string; annual_rate: number } | null
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

        for (const ci of contractInvestors ?? []) {
          // Generate token if missing
          let portalToken = ci.portal_token
          if (!portalToken) {
            portalToken = crypto.randomUUID()
            const expiresAt = new Date()
            expiresAt.setFullYear(expiresAt.getFullYear() + 1)

            await supabase
              .from('contract_investors')
              .update({
                portal_token: portalToken,
                token_expires_at: expiresAt.toISOString(),
              })
              .eq('id', ci.id)
          }

          // Get investor data
          const { data: investor } = await supabase
            .from('investors')
            .select('full_name, cedula')
            .eq('id', ci.investor_id)
            .single()

          // Get investor email
          const { data: emails } = await supabase
            .from('investor_emails')
            .select('email')
            .eq('investor_id', ci.investor_id)
            .eq('is_primary', true)
            .limit(1)

          const primaryEmail = emails?.[0]?.email

          if (investor && primaryEmail && contractWithPlan) {
            // Generate contract PDF
            const pdfData = {
              investor_name: investor.full_name,
              investor_cedula: investor.cedula,
              amount: contractWithPlan.amount,
              term_months: contractWithPlan.term_months,
              start_date: contractWithPlan.start_date ?? '',
              end_date: contractWithPlan.end_date,
              annual_rate: plan?.annual_rate ?? 0,
              plan_name: plan?.name ?? '—',
              plan_type: plan?.type ?? 'annual',
              contract_id: id,
            }

            try {
              const pdfBuffer = await generateContractPdf(pdfData)
              const storagePath = `${id}/contrato_${Date.now()}.pdf`

              await supabase.storage
                .from('contracts')
                .upload(storagePath, pdfBuffer, {
                  contentType: 'application/pdf',
                  upsert: false,
                })

              await supabase
                .from('contract_documents')
                .insert({
                  contract_id: id,
                  type: 'draft',
                  file_name: `contrato-${id.slice(0, 8)}.pdf`,
                  storage_path: storagePath,
                  file_size: pdfBuffer.length,
                  mime_type: 'application/pdf',
                })
            } catch (pdfErr) {
              console.error('Error generating contract PDF:', pdfErr)
            }

            // Send invitation email
            await sendContractInvitationEmail({
              to: [primaryEmail],
              investorName: investor.full_name,
              planName: plan?.name ?? '—',
              amount: contractWithPlan.amount,
              termMonths: contractWithPlan.term_months,
              portalUrl: `${appUrl}/portal/${portalToken}`,
            })
          }
        }
      }

      return NextResponse.json({ contract: updated })
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/contracts/[id]/route.ts
git commit -m "feat: generar tokens, PDF e invitación al enviar contrato a aprobación"
```

---

## Task 10: Update Portal GET — Include Signature Data

**Files:**
- Modify: `src/app/api/portal/[token]/route.ts`
- Modify: `src/types/portal.ts`

- [ ] **Step 1: Update portal GET response to include signature fields**

In `src/app/api/portal/[token]/route.ts`, update the `contractInvestor` response object (around line 124) to include:

```typescript
    contractInvestor: {
      id: contractInvestor.id,
      role: contractInvestor.role,
      approval_status: contractInvestor.approval_status,
      revision_comment: contractInvestor.revision_comment,
      approved_at: contractInvestor.approved_at,
      signed_at: contractInvestor.signed_at,
      signature_name: contractInvestor.signature_name,
    },
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/portal/[token]/route.ts src/types/portal.ts
git commit -m "feat: incluir datos de firma en response del portal"
```

---

## Task 11: Portal UI — Signing Flow Component

**Files:**
- Create: `src/app/(portal)/portal/[token]/_components/signing-flow.tsx`
- Modify: `src/app/(portal)/portal/[token]/_components/portal-contract-view.tsx`

- [ ] **Step 1: Create the signing flow component**

Create `src/app/(portal)/portal/[token]/_components/signing-flow.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { SigningStep } from '@/types/signing'

interface SigningFlowProps {
  token: string
  amount: number
}

export function SigningFlow({ token, amount }: SigningFlowProps) {
  const [step, setStep] = useState<SigningStep>('identity')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')

  // Identity step
  const [name, setName] = useState('')
  const [cedula, setCedula] = useState('')

  // Verification step
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(0)

  // Confirmation step
  const [accepted, setAccepted] = useState(false)

  function formatCedula(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 9)
    if (digits.length <= 1) return digits
    if (digits.length <= 5) return `${digits[0]}-${digits.slice(1)}`
    return `${digits[0]}-${digits.slice(1, 5)}-${digits.slice(5)}`
  }

  async function handleIdentitySubmit() {
    if (!name.trim() || !cedula.trim()) {
      setError('Completa todos los campos.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/portal/${token}/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), cedula: cedula.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message ?? 'Error al verificar identidad.')
        return
      }

      setMaskedEmail(data.masked_email)
      setStep('verification')
    } catch {
      setError('Error de conexión.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendCode() {
    if (cooldown > 0) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/portal/${token}/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), cedula: cedula.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message ?? 'Error al reenviar código.')
        return
      }

      setMaskedEmail(data.masked_email)
      setCode('')

      // Start 60s cooldown
      setCooldown(60)
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch {
      setError('Error de conexión.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerificationSubmit() {
    if (!code.trim()) {
      setError('Ingresa el código de verificación.')
      return
    }

    setError('')
    setStep('confirmation')
  }

  async function handleSign() {
    if (!accepted) {
      setError('Debes aceptar los términos del contrato.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/portal/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'INVALID_CODE' || data.error === 'CODE_EXPIRED' || data.error === 'MAX_ATTEMPTS' || data.error === 'NO_CODE') {
          setStep('verification')
          setCode('')
        }
        setError(data.message ?? 'Error al firmar el contrato.')
        return
      }

      setStep('success')
    } catch {
      setError('Error de conexión.')
    } finally {
      setLoading(false)
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  // --- STEP: Identity ---
  if (step === 'identity') {
    return (
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 sm:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Firmar contrato</h2>
          <p className="text-sm text-zinc-600 mt-1">
            Paso 1 de 3 — Verifica tu identidad
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tal como aparece en tu cédula"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Número de cédula</label>
            <input
              type="text"
              value={cedula}
              onChange={(e) => setCedula(formatCedula(e.target.value))}
              placeholder="X-XXXX-XXXX"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleIdentitySubmit}
          disabled={loading}
          className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Verificando...' : 'Verificar identidad'}
        </button>
      </div>
    )
  }

  // --- STEP: Verification ---
  if (step === 'verification') {
    return (
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 sm:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Firmar contrato</h2>
          <p className="text-sm text-zinc-600 mt-1">
            Paso 2 de 3 — Código de verificación
          </p>
        </div>

        <p className="text-sm text-zinc-600">
          Enviamos un código de 6 dígitos a <strong className="text-zinc-900">{maskedEmail}</strong>
        </p>

        <div>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="w-full rounded-lg border border-zinc-300 px-3 py-3 text-center text-xl font-mono tracking-[0.3em] text-zinc-900 placeholder:text-zinc-300 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleVerificationSubmit}
          disabled={loading || code.length !== 6}
          className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          Continuar
        </button>

        <button
          type="button"
          onClick={handleResendCode}
          disabled={cooldown > 0 || loading}
          className="w-full text-sm text-zinc-500 hover:text-zinc-700 disabled:opacity-50 transition-colors"
        >
          {cooldown > 0 ? `Reenviar código (${cooldown}s)` : 'Reenviar código'}
        </button>
      </div>
    )
  }

  // --- STEP: Confirmation ---
  if (step === 'confirmation') {
    return (
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 sm:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Firmar contrato</h2>
          <p className="text-sm text-zinc-600 mt-1">
            Paso 3 de 3 — Confirma tu firma
          </p>
        </div>

        <div className="bg-white rounded-lg border border-zinc-200 p-4 text-sm text-zinc-600 leading-relaxed">
          <p className="mb-3">
            Al firmar este contrato por <strong className="text-zinc-900">{formatCurrency(amount)}</strong>,
            declaras que:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Has leído y comprendido todos los términos del contrato</li>
            <li>Aceptas las condiciones del plan de inversión</li>
            <li>La información proporcionada es verídica</li>
          </ul>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-sm text-zinc-700">
            He leído el contrato y acepto todos los términos y condiciones establecidos
          </span>
        </label>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Esta firma electrónica tiene validez legal de acuerdo con la Ley N° 8454
          de Costa Rica. Se registrará la fecha, hora y dirección IP como parte del
          certificado de firma.
        </p>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSign}
          disabled={loading || !accepted}
          className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Firmando...' : 'Firmar contrato'}
        </button>

        <button
          type="button"
          onClick={() => { setStep('verification'); setError('') }}
          className="w-full text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          Volver al paso anterior
        </button>
      </div>
    )
  }

  // --- STEP: Success ---
  return (
    <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 sm:p-6 space-y-4 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-zinc-900">Contrato firmado</h2>
      <p className="text-sm text-zinc-600">
        Tu contrato ha sido firmado exitosamente. También enviamos una copia a tu email.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
      >
        Ver contrato firmado
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Replace approve/revision buttons in portal-contract-view.tsx**

In `src/app/(portal)/portal/[token]/_components/portal-contract-view.tsx`, replace the action section (lines 335-351) from:

```tsx
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
```

To:

```tsx
      {isPendingApproval && (
        <SigningFlow token={token} amount={contract.amount} />
      )}

      {contractInvestor.signed_at && (
        <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 sm:p-6 text-center space-y-2">
          <div className="mx-auto w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-green-800">
            Contrato firmado el {new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(contractInvestor.signed_at))}
          </p>
        </div>
      )}
```

Also add the import at the top:

```tsx
import { SigningFlow } from './signing-flow'
```

Remove the unused imports for `PortalApproveButton` and `PortalRevisionButton` if they are no longer used elsewhere.

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(portal)/portal/[token]/_components/signing-flow.tsx src/app/(portal)/portal/[token]/_components/portal-contract-view.tsx
git commit -m "feat: flujo de firma electrónica en 3 pasos en el portal del inversionista"
```

---

## Task 12: Admin UI — Copy Portal Link + Signature Status

**Files:**
- Modify: `src/app/(dashboard)/dashboard/contracts/[id]/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/contracts/_components/contract-actions.tsx`

- [ ] **Step 1: Add portal link copy button to contract actions**

In `src/app/(dashboard)/dashboard/contracts/_components/contract-actions.tsx`, add inside the `pending_approval` section (after the existing buttons, around line 230):

```tsx
        {currentStatus === 'pending_approval' && (
          <>
            {/* ... existing approve/revision buttons ... */}
            <CopyPortalLinkButton contractId={contractId} />
          </>
        )}
```

Add a new `CopyPortalLinkButton` component at the top of the same file (before `ContractActions`):

```tsx
function CopyPortalLinkButton({ contractId }: { contractId: string }) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [portalUrl, setPortalUrl] = useState<string | null>(null)

  async function fetchAndCopy() {
    setLoading(true)
    try {
      const res = await fetch(`/api/contracts/${contractId}`)
      const data = await res.json()
      const holders = data?.contract_investors?.filter(
        (ci: { portal_token: string | null }) => ci.portal_token
      )
      if (holders?.[0]?.portal_token) {
        const appUrl = window.location.origin
        const url = `${appUrl}/portal/${holders[0].portal_token}`
        setPortalUrl(url)
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={fetchAndCopy}
      disabled={loading}
      className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
    >
      {copied ? '¡Link copiado!' : loading ? 'Cargando...' : 'Copiar link del portal'}
    </button>
  )
}
```

- [ ] **Step 2: Show signature status per investor in contract detail page**

In `src/app/(dashboard)/dashboard/contracts/[id]/page.tsx`, update the investors table to show signature status. In the table body (around line 319), add after the approval status `<td>`:

```tsx
                      <td className="px-4 py-3">
                        {ci.signed_at ? (
                          <span className="text-xs text-green-700">
                            Firmado el {new Intl.DateTimeFormat('es-CR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(ci.signed_at))}
                          </span>
                        ) : ci.approval_status === 'pending' ? (
                          <span className="text-xs text-yellow-600">Pendiente de firma</span>
                        ) : null}
                      </td>
```

Also add the header for this column in the `<thead>`:

```tsx
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Firma
                  </th>
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/dashboard/contracts/[id]/page.tsx src/app/(dashboard)/dashboard/contracts/_components/contract-actions.tsx
git commit -m "feat: botón copiar link del portal y estado de firma en dashboard admin"
```

---

## Task 13: Integration Test — Full Flow Verification

- [ ] **Step 1: Verify compilation of entire project**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 2: Start dev server and test manually**

```bash
npm run dev
```

Test flow:
1. Go to contracts list, open a contract in Borrador
2. Click "Enviar a aprobación" — should generate token + PDF + send email (check console for dev log)
3. Copy portal link from admin UI
4. Open portal link in incognito — should see contract summary
5. Click "Firmar contrato" → enter name + cédula → verify identity
6. Check console for verification code
7. Enter code → accept terms → sign
8. Verify: signed PDF appears in documents, portal shows "Firmado"
9. Check admin view: signature status shows "Firmado el..."

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: ajustes de integración del flujo de firma"
```

---

## Dependency Graph

```
Task 1 (DB migration) ──┐
Task 2 (Types)      ────┤
Task 3 (Install dep) ───┤
                         ├── Task 4 (Verification service) ── Task 7 (API request-code) ──┐
                         ├── Task 5 (Emails)                                                ├── Task 8 (API sign)
                         ├── Task 6 (PDF generation) ──────────────────────────────────────┘     │
                         │                                                                       │
                         ├── Task 9 (Modify contract PATCH) ← depends on Task 5, 6              │
                         ├── Task 10 (Update portal GET)                                         │
                         ├── Task 11 (Portal UI signing flow) ← depends on Task 7, 8            │
                         └── Task 12 (Admin UI) ← depends on Task 9                             │
                                                                                                 │
                         Task 13 (Integration test) ← depends on all ────────────────────────────┘
```

**Parallelizable groups:**
- Group A: Tasks 1, 2, 3 (foundation — run sequentially)
- Group B: Tasks 4, 5, 6 (services — can run in parallel after Group A)
- Group C: Tasks 7, 8 (API routes — after Group B)
- Group D: Tasks 9, 10, 11, 12 (UI + modifications — after Group C)
- Group E: Task 13 (integration — after all)
