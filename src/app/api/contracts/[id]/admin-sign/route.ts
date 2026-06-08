import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import {
  generateSignedContractPdf,
  computeDocumentHash,
  generateContractPdf,
} from '@/lib/pdf/generate-contract-pdf'
import { sendContractActivatedEmail } from '@/lib/email/contract-activated-email'
import type { ContractPdfData, SignatureCertificateData } from '@/types/signing'

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

/**
 * Firma del admin (April) sobre un contrato que ya fue firmado por el
 * inversionista. Al completarse:
 *  - Se registra la firma (nombre, IP, user_agent, timestamp) en `contracts`.
 *  - Se regenera el PDF firmado con AMBAS firmas en el certificado.
 *  - El contrato pasa de 'pending_admin_signature' a 'active'.
 *  - Se envía email al inversionista confirmando la activación.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params
    const authClient = await createClient()
    const supabase = createServiceClient()

    // 1. Auth: must be logged in
    const {
      data: { user },
    } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // 2. Verify caller is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, full_name, role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden firmar contratos.' },
        { status: 403 }
      )
    }

    // 3. Fetch contract + verify status
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        id, amount, term_months, start_date, end_date, status, rendered_content,
        investment_plans (name, type, annual_rate)
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }

    if (contract.status !== 'pending_admin_signature') {
      return NextResponse.json(
        { error: 'El contrato no está esperando firma de la contratista.' },
        { status: 422 }
      )
    }

    // 4. Fetch holder for the PDF
    const { data: holderRow } = await supabase
      .from('contract_investors')
      .select(`
        id,
        signature_name,
        signature_cedula,
        signature_ip,
        signed_at,
        investor:investors(full_name, cedula)
      `)
      .eq('contract_id', contractId)
      .eq('role', 'holder')
      .single()

    if (!holderRow) {
      return NextResponse.json(
        { error: 'No se encontró el inversionista del contrato.' },
        { status: 500 }
      )
    }

    const investor = holderRow.investor as { full_name: string; cedula: string } | null
    const holderName = holderRow.signature_name ?? investor?.full_name ?? '—'
    const holderCedula = holderRow.signature_cedula ?? investor?.cedula ?? '—'
    const investorSignedAt = holderRow.signed_at ?? new Date().toISOString()
    const investorIp = holderRow.signature_ip ?? 'unknown'

    // 5. Capture admin signature data
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'
    const userAgent = request.headers.get('user-agent') ?? 'unknown'
    const signedAt = new Date().toISOString()
    const adminName = profile.full_name

    // 6. Compute end_date if missing
    const endDate =
      !contract.end_date && contract.start_date && contract.term_months
        ? addMonths(new Date(contract.start_date), contract.term_months).toISOString().split('T')[0]
        : contract.end_date

    // 7. Generate PDF with BOTH signatures
    const plan = contract.investment_plans as { name: string; type: string; annual_rate: number } | null

    const contractPdfData: ContractPdfData = {
      investor_name: holderName,
      investor_cedula: holderCedula,
      amount: contract.amount,
      term_months: contract.term_months,
      start_date: contract.start_date ?? new Date().toISOString().split('T')[0],
      end_date: endDate,
      annual_rate: plan?.annual_rate ?? 0,
      plan_name: plan?.name ?? 'Sin plan',
      plan_type: plan?.type ?? 'unknown',
      contract_id: contract.id,
    }

    const unsignedBuffer = await generateContractPdf(contractPdfData, contract.rendered_content)
    const documentHash = computeDocumentHash(unsignedBuffer)

    const signatureCertData: SignatureCertificateData = {
      signer_name: holderName,
      signer_cedula: holderCedula,
      signed_at: investorSignedAt,
      ip_address: investorIp,
      document_hash: documentHash,
      admin_signer: {
        name: adminName,
        signed_at: signedAt,
        ip_address: ip,
      },
    }

    const signedBuffer = await generateSignedContractPdf(
      contractPdfData,
      signatureCertData,
      contract.rendered_content,
    )

    // 8. Build descriptive file name and storage path
    const { buildContractFileName, buildContractStoragePath } = await import(
      '@/lib/pdf/file-naming'
    )
    const storagePath = buildContractStoragePath({
      contractId,
      investorName: holderName,
      stage: 'fully-signed',
    })
    const fileName = buildContractFileName({
      contractId,
      investorName: holderName,
      stage: 'fully-signed',
    })

    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(storagePath, signedBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('[admin-sign] Error uploading PDF:', uploadError)
      return NextResponse.json(
        { error: 'Error al guardar el PDF firmado.' },
        { status: 500 }
      )
    }

    // 9. Insert document record
    await supabase.from('contract_documents').insert({
      contract_id: contractId,
      type: 'signed_contract',
      file_name: fileName,
      storage_path: storagePath,
      file_size: signedBuffer.length,
      mime_type: 'application/pdf',
      uploaded_by: user.id,
    })

    // 10. Update contract: admin signature data + activate
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        admin_signed_at: signedAt,
        admin_signed_by: user.id,
        admin_signature_name: adminName,
        admin_signature_ip: ip,
        admin_signature_user_agent: userAgent,
        status: 'active',
        end_date: endDate,
        updated_at: signedAt,
      })
      .eq('id', contractId)
      .eq('status', 'pending_admin_signature')

    if (updateError) {
      console.error('[admin-sign] Error updating contract:', updateError)
      return NextResponse.json(
        { error: 'Error al activar el contrato.' },
        { status: 500 }
      )
    }

    // 11. Email investor — contract activated
    try {
      const { data: emails } = await supabase
        .from('investor_emails')
        .select('email')
        .eq('investor_id', (holderRow.investor as { id?: string } | null)?.['id'] ?? '')
        .eq('is_primary', true)
        .limit(1)

      // Above query may fail (no id field); fallback via contract_investors join
      let primaryEmail = emails?.[0]?.email

      if (!primaryEmail) {
        const { data: ciInvestor } = await supabase
          .from('contract_investors')
          .select('investor_id')
          .eq('contract_id', contractId)
          .eq('role', 'holder')
          .single()

        if (ciInvestor?.investor_id) {
          const { data: fallbackEmails } = await supabase
            .from('investor_emails')
            .select('email')
            .eq('investor_id', ciInvestor.investor_id)
            .eq('is_primary', true)
            .limit(1)
          primaryEmail = fallbackEmails?.[0]?.email
        }
      }

      if (primaryEmail) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        const { data: portalCi } = await supabase
          .from('contract_investors')
          .select('portal_token')
          .eq('contract_id', contractId)
          .eq('role', 'holder')
          .single()

        await sendContractActivatedEmail({
          to: [primaryEmail],
          investorName: holderName,
          planName: plan?.name ?? 'Sin plan',
          amount: contract.amount,
          portalUrl: portalCi?.portal_token
            ? `${appUrl}/portal/${portalCi.portal_token}`
            : appUrl,
        })
      }
    } catch (emailErr) {
      console.error('[admin-sign] Error sending activation email:', emailErr)
    }

    return NextResponse.json({ success: true, contract_id: contractId })
  } catch (err) {
    console.error('[admin-sign] Unhandled error:', err)
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
