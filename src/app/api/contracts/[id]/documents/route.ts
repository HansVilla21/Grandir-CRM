import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireInternalUser } from '@/lib/auth/guard'
import type { DocumentType } from '@/types/contracts'

const VALID_DOCUMENT_TYPES: DocumentType[] = [
  'draft',
  'signed_contract',
  'deposit_receipt',
  'disbursement_receipt',
  'report',
  'addendum',
]

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireInternalUser()
    if (response) return response

    const { id: contractId } = await params
    const supabase = createServiceClient()

    // Verify contract exists
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const documentType = formData.get('type') as DocumentType | null

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    if (!documentType || !VALID_DOCUMENT_TYPES.includes(documentType)) {
      return NextResponse.json({ error: 'Tipo de documento inválido' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos PDF e imágenes (JPEG, PNG, WebP)' },
        { status: 400 }
      )
    }

    // Max 20 MB
    const MAX_SIZE = 20 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'El archivo no puede superar 20 MB' }, { status: 400 })
    }

    // Build storage path: contracts/{contract_id}/{timestamp}_{filename}
    const timestamp = Date.now()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${contractId}/${timestamp}_${safeFileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Create document record
    const { data: document, error: docError } = await supabase
      .from('contract_documents')
      .insert({
        contract_id: contractId,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        type: documentType,
        version: 1,
      })
      .select()
      .single()

    if (docError) {
      // Best-effort cleanup
      await supabase.storage.from('contracts').remove([storagePath])
      return NextResponse.json({ error: docError.message }, { status: 500 })
    }

    return NextResponse.json({ document }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
