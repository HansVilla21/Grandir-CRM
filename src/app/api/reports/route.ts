import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireInternalUser } from '@/lib/auth/guard'

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireInternalUser()
    if (response) return response

    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const contractId = searchParams.get('contract_id')

    // Fetch reports with contract + plan + holder
    let query = supabase
      .from('reports')
      .select(`
        id,
        contract_id,
        period_start,
        period_end,
        growth_rate,
        calculated_amount,
        status,
        sent_at,
        created_at,
        contracts (
          plan_id,
          amount,
          investment_plans (
            name
          )
        )
      `)
      .order('period_end', { ascending: false })

    if (status) {
      query = query.eq('status', status as 'pending' | 'generated' | 'sent')
    }
    if (contractId) {
      query = query.eq('contract_id', contractId)
    }

    const { data: reports, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch holder names for all contracts in results
    const contractIds = [...new Set((reports ?? []).map((r) => r.contract_id))]
    const holderMap = new Map<string, string>()

    if (contractIds.length > 0) {
      const { data: holders } = await supabase
        .from('contract_investors')
        .select('contract_id, investors(full_name)')
        .in('contract_id', contractIds)
        .eq('role', 'holder')

      for (const h of holders ?? []) {
        const inv = h.investors as { full_name: string } | null
        if (inv?.full_name) holderMap.set(h.contract_id, inv.full_name)
      }
    }

    type ReportRow = NonNullable<typeof reports>[number]

    const list = (reports ?? []).map((r: ReportRow) => {
      const contract = r.contracts as {
        investment_plans: { name: string } | null
      } | null
      return {
        id: r.id,
        contract_id: r.contract_id,
        holder_name: holderMap.get(r.contract_id) ?? '—',
        plan_name: contract?.investment_plans?.name ?? '—',
        period_start: r.period_start,
        period_end: r.period_end,
        growth_rate: r.growth_rate,
        calculated_amount: r.calculated_amount,
        status: r.status,
        sent_at: r.sent_at,
        created_at: r.created_at,
      }
    })

    return NextResponse.json(list)
  } catch (err) {
    console.error('GET /api/reports error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireInternalUser()
    if (response) return response

    const supabase = createServiceClient()
    const body = await request.json()

    const { contract_id, period_start, period_end, growth_rate, calculated_amount, description } = body

    if (!contract_id || !period_start || !period_end || growth_rate === undefined) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: contract_id, period_start, period_end, growth_rate' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('reports')
      .insert({
        contract_id,
        period_start,
        period_end,
        growth_rate: Number(growth_rate),
        calculated_amount: calculated_amount != null ? Number(calculated_amount) : null,
        description: description ?? null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Auto-generate PDF for the report (non-blocking — if it fails the report still exists)
    try {
      const { generateReportPdf } = await import('@/lib/pdf/generate-report-pdf')

      // Get contract + plan + holder
      const { data: contractData } = await supabase
        .from('contracts')
        .select(`
          id, amount,
          investment_plans (name, type)
        `)
        .eq('id', contract_id)
        .single()

      const { data: holderRow } = await supabase
        .from('contract_investors')
        .select('investor:investors(full_name, cedula)')
        .eq('contract_id', contract_id)
        .eq('role', 'holder')
        .single()

      const plan = contractData?.investment_plans as
        | { name: string; type: string }
        | null
      const investor = holderRow?.investor as
        | { full_name: string; cedula: string }
        | null

      if (contractData && plan && investor) {
        const pdfBuffer = await generateReportPdf({
          report_id: data.id,
          contract_id: contract_id,
          investor_name: investor.full_name,
          investor_cedula: investor.cedula,
          plan_name: plan.name,
          plan_type: plan.type,
          capital_invertido: contractData.amount,
          period_start,
          period_end,
          growth_rate: Number(growth_rate),
          calculated_amount: calculated_amount != null ? Number(calculated_amount) : null,
          description: description ?? null,
          generated_at: new Date().toISOString(),
        })

        const storagePath = `${contract_id}/report_${data.id}_${Date.now()}.pdf`
        const storageClient = createServiceClient()
        const { error: uploadError } = await storageClient.storage
          .from('contracts')
          .upload(storagePath, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: false,
          })

        if (!uploadError) {
          await supabase
            .from('reports')
            .update({
              pdf_path: storagePath,
              status: 'generated',
            })
            .eq('id', data.id)

          // Also create a contract_documents record for unified document view
          await supabase.from('contract_documents').insert({
            contract_id,
            type: 'report',
            file_name: `reporte-${data.id.slice(0, 8)}.pdf`,
            storage_path: storagePath,
            file_size: pdfBuffer.length,
            mime_type: 'application/pdf',
          })

          // Update local data so the response is accurate
          data.pdf_path = storagePath
          data.status = 'generated'
        } else {
          console.error('[reports] PDF upload error:', uploadError)
        }
      }
    } catch (pdfErr) {
      console.error('[reports] Auto-PDF generation failed:', pdfErr)
      // Report still created in 'pending' state; admin can upload manually
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('POST /api/reports error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
