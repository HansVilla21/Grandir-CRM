import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type DocumentType = Database['public']['Enums']['document_type']

const ALLOWED_TYPES: DocumentType[] = ['signed_contract', 'deposit_receipt']

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const supabase = createServiceClient()

  // Buscar contract_investor por token
  const { data: contractInvestor, error: ciError } = await supabase
    .from('contract_investors')
    .select('id, contract_id, token_expires_at')
    .eq('portal_token', token)
    .single()

  if (ciError || !contractInvestor) {
    return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 404 })
  }

  // Verificar expiración
  if (
    contractInvestor.token_expires_at &&
    new Date(contractInvestor.token_expires_at) < new Date()
  ) {
    return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 404 })
  }

  // Parsear form data
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'INVALID_FORM_DATA' }, { status: 400 })
  }

  const file = formData.get('file')
  const docType = formData.get('type') as string | null

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'FILE_REQUIRED' }, { status: 400 })
  }

  if (!docType || !ALLOWED_TYPES.includes(docType as DocumentType)) {
    return NextResponse.json(
      { error: 'INVALID_TYPE', allowed: ALLOWED_TYPES },
      { status: 400 }
    )
  }

  const contractId = contractInvestor.contract_id
  const timestamp = Date.now()
  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${contractId}/portal/${timestamp}_${safeFilename}`

  // Subir archivo al bucket contracts
  const fileBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('contracts')
    .upload(storagePath, fileBuffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    console.error('[documents] Upload error:', uploadError)
    return NextResponse.json(
      { error: 'UPLOAD_FAILED', details: uploadError.message },
      { status: 500 }
    )
  }

  // Registrar en contract_documents
  const { data: docRecord, error: insertError } = await supabase
    .from('contract_documents')
    .insert({
      contract_id: contractId,
      type: docType as DocumentType,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
      storage_path: storagePath,
      uploaded_by_portal: contractInvestor.id,
      version: 1,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[documents] Insert error:', insertError)
    return NextResponse.json(
      { error: 'INSERT_FAILED', details: insertError.message },
      { status: 500 }
    )
  }

  // Notify admins that an investor uploaded a document from the portal
  try {
    const { data: ciDetail } = await supabase
      .from('contract_investors')
      .select('investor_id, investor:investors(full_name)')
      .eq('id', contractInvestor.id)
      .single()
    const investor = ciDetail?.investor as { full_name: string } | null

    const docTypeLabel =
      docType === 'signed_contract' ? 'contrato firmado' : 'comprobante de depósito'

    const { notifyAdmins } = await import('@/lib/notifications/notify-admins')
    await notifyAdmins({
      supabase,
      type: 'new_application',
      channel: 'both',
      title: 'Nuevo documento subido al portal',
      body: `${investor?.full_name ?? 'Un inversionista'} subió un ${docTypeLabel} en el contrato #${contractId.slice(0, 8).toUpperCase()}`,
      contract_id: contractId,
      investor_id: ciDetail?.investor_id ?? undefined,
    })
  } catch (notifyError) {
    console.error('[documents] notify error:', notifyError)
  }

  return NextResponse.json({ success: true, document_id: docRecord.id })
}
