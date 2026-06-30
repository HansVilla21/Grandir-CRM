import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireInternalUser } from '@/lib/auth/guard'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireInternalUser()
    if (response) return response

    const { id } = await params
    const supabase = createServiceClient()

    // Fetch report to get contract_id
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('id, contract_id, status')
      .eq('id', id)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Solo se aceptan archivos PDF' }, { status: 400 })
    }

    const storagePath = `${report.contract_id}/${report.id}.pdf`
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    const storageClient = createServiceClient()
    const { error: uploadError } = await storageClient.storage
      .from('contracts')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Update report
    const { data: updated, error: updateError } = await supabase
      .from('reports')
      .update({
        pdf_path: storagePath,
        status: 'generated',
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, pdf_path: storagePath, report: updated })
  } catch (err) {
    console.error('POST /api/reports/[id]/upload error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
