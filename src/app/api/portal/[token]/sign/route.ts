import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateCode } from '@/lib/signing/verification'
import {
  generateSignedContractPdf,
  computeDocumentHash,
  generateContractPdf,
} from '@/lib/pdf/generate-contract-pdf'
import { sendSigningConfirmationEmail } from '@/lib/email/signing-confirmation-email'
import { sendSigningNotificationEmail } from '@/lib/email/signing-notification-email'
import type { ContractPdfData, SignatureCertificateData } from '@/types/signing'

const codeErrorMessages: Record<string, string> = {
  NO_CODE: 'No hay un código activo. Solicita uno nuevo.',
  CODE_EXPIRED: 'El código ha expirado. Solicita uno nuevo.',
  MAX_ATTEMPTS: 'Demasiados intentos incorrectos. Solicita un nuevo código.',
  INVALID_CODE: 'Código incorrecto.',
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // 1. Parse body
    const body = await request.json().catch(() => null)
    const code = body?.code as string | undefined

    if (!code) {
      return NextResponse.json(
        { error: 'MISSING_CODE', message: 'El código de verificación es requerido.' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 2. Validate token — find contract_investor by portal_token
    const { data: ci, error: ciError } = await supabase
      .from('contract_investors')
      .select('id, contract_id, investor_id, approval_status, token_expires_at, portal_token')
      .eq('portal_token', token)
      .single()

    if (ciError || !ci) {
      return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 404 })
    }

    // Check token expiration
    if (ci.token_expires_at && new Date(ci.token_expires_at) < new Date()) {
      return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 404 })
    }

    // Check if already signed
    if (ci.approval_status !== 'pending') {
      return NextResponse.json(
        { error: 'ALREADY_SIGNED', message: 'Este contrato ya fue firmado.' },
        { status: 400 }
      )
    }

    // 3. Validate verification code
    const validation = await validateCode(ci.id, code.trim())

    if (!validation.valid) {
      const message = validation.error
        ? codeErrorMessages[validation.error] ?? 'Error de verificación.'
        : 'Error de verificación.'

      return NextResponse.json(
        { error: validation.error ?? 'VALIDATION_ERROR', message },
        { status: 422 }
      )
    }

    // 4. Capture signature data
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'
    const userAgent = request.headers.get('user-agent') ?? 'unknown'
    const signedAt = new Date().toISOString()

    // 5. Get investor data
    const { data: investor, error: investorError } = await supabase
      .from('investors')
      .select('full_name, cedula')
      .eq('id', ci.investor_id)
      .single()

    if (investorError || !investor) {
      console.error('[sign] Error fetching investor:', investorError)
      return NextResponse.json(
        { error: 'INVESTOR_NOT_FOUND', message: 'No se encontró el inversionista.' },
        { status: 500 }
      )
    }

    // 6. Update contract_investor with signature data
    const { error: updateError } = await supabase
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

    if (updateError) {
      console.error('[sign] Error updating contract_investor:', updateError)
      return NextResponse.json(
        { error: 'UPDATE_FAILED', message: 'Error al registrar la firma.' },
        { status: 500 }
      )
    }

    // 7. Generate signed PDF
    const contractId = ci.contract_id

    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        id,
        amount,
        term_months,
        start_date,
        end_date,
        investment_plans (
          name,
          type,
          annual_rate
        )
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      console.error('[sign] Error fetching contract:', contractError)
      // La firma ya se registró — no revertimos, pero logueamos el error
      return NextResponse.json({ success: true, pdf_generated: false })
    }

    const plan = contract.investment_plans as { name: string; type: string; annual_rate: number } | null

    const contractPdfData: ContractPdfData = {
      investor_name: investor.full_name,
      investor_cedula: investor.cedula ?? '',
      amount: contract.amount,
      term_months: contract.term_months,
      start_date: contract.start_date ?? new Date().toISOString().split('T')[0],
      end_date: contract.end_date,
      annual_rate: plan?.annual_rate ?? 0,
      plan_name: plan?.name ?? 'Sin plan',
      plan_type: plan?.type ?? 'unknown',
      contract_id: contract.id,
    }

    // Generate unsigned PDF first to compute hash
    const unsignedBuffer = await generateContractPdf(contractPdfData)
    const documentHash = computeDocumentHash(unsignedBuffer)

    const signatureCertData: SignatureCertificateData = {
      signer_name: investor.full_name,
      signer_cedula: investor.cedula ?? '',
      signed_at: signedAt,
      ip_address: ip,
      document_hash: documentHash,
    }

    // Generate the signed PDF (contract + signature certificate)
    const signedBuffer = await generateSignedContractPdf(contractPdfData, signatureCertData)

    // Upload to Supabase Storage
    const storagePath = `${contractId}/signed_${Date.now()}.pdf`

    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(storagePath, signedBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('[sign] Error uploading signed PDF:', uploadError)
      // Non-blocking — la firma ya se registró
    } else {
      // Insert contract_documents record
      const { error: docError } = await supabase.from('contract_documents').insert({
        contract_id: contractId,
        type: 'signed_contract',
        file_name: `signed_${Date.now()}.pdf`,
        storage_path: storagePath,
        file_size: signedBuffer.length,
        mime_type: 'application/pdf',
        uploaded_by_portal: ci.id,
      })

      if (docError) {
        console.error('[sign] Error inserting contract_documents:', docError)
      }
    }

    // 8. Send confirmation email to investor
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const { data: emails } = await supabase
      .from('investor_emails')
      .select('email, is_primary')
      .eq('investor_id', ci.investor_id)
      .eq('is_primary', true)
      .limit(1)

    const primaryEmail = emails?.[0]?.email

    if (primaryEmail) {
      try {
        await sendSigningConfirmationEmail({
          to: [primaryEmail],
          investorName: investor.full_name,
          planName: plan?.name ?? 'Sin plan',
          amount: contract.amount,
          signedAt,
          portalUrl: `${appUrl}/portal/${token}`,
        })
      } catch (emailError) {
        console.error('[sign] Error sending confirmation email:', emailError)
      }
    }

    // 9. Send notification to admin(s)
    try {
      const { data: adminProfiles } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('role', 'admin')

      if (adminProfiles && adminProfiles.length > 0) {
        const adminEmails: string[] = []

        for (const profile of adminProfiles) {
          const { data: userData } = await supabase.auth.admin.getUserById(profile.id)
          if (userData?.user?.email) {
            adminEmails.push(userData.user.email)
          }
        }

        if (adminEmails.length > 0) {
          await sendSigningNotificationEmail({
            to: adminEmails,
            investorName: investor.full_name,
            contractId,
            planName: plan?.name ?? 'Sin plan',
            amount: contract.amount,
            signedAt,
            dashboardUrl: `${appUrl}/dashboard/contracts/${contractId}`,
          })
        }
      }
    } catch (notifyError) {
      console.error('[sign] Error sending admin notification:', notifyError)
    }

    // 10. Return success
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[sign] Unhandled error:', error)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Error interno del servidor.' },
      { status: 500 }
    )
  }
}
