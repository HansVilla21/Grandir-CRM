import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServiceClient } from '@/lib/supabase/server'

interface BatchBody {
  growth_rate: number
  period_start: string // YYYY-MM-DD
  period_end: string // YYYY-MM-DD
  description?: string | null
  contract_ids: string[] // explicit list to include
}

/**
 * POST /api/reports/batch
 *
 * Creates reports for multiple contracts at once. Same growth_rate applied to all.
 * For each contract: calculated_amount = capital × growth_rate / 100
 * Auto-generates PDF for each (non-blocking; failures logged).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const storageClient = createServiceClient() // bypass RLS for storage
    const body = (await request.json()) as BatchBody

    if (
      body.growth_rate === undefined ||
      body.growth_rate === null ||
      !body.period_start ||
      !body.period_end ||
      !Array.isArray(body.contract_ids) ||
      body.contract_ids.length === 0
    ) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: growth_rate, period_start, period_end, contract_ids' },
        { status: 400 }
      )
    }

    const growthRate = Number(body.growth_rate)
    if (Number.isNaN(growthRate)) {
      return NextResponse.json({ error: 'Tasa de crecimiento inválida' }, { status: 400 })
    }

    // Fetch contracts to create reports for
    const { data: contractsRaw, error: contractsError } = await supabase
      .from('contracts')
      .select(`
        id, amount,
        investment_plans (name, type)
      `)
      .in('id', body.contract_ids)
      .eq('status', 'active')

    if (contractsError || !contractsRaw || contractsRaw.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron contratos válidos para reportar' },
        { status: 404 }
      )
    }

    // Holders
    const { data: holdersRaw } = await supabase
      .from('contract_investors')
      .select('contract_id, investor:investors(full_name, cedula)')
      .in('contract_id', contractsRaw.map((c) => c.id))
      .eq('role', 'holder')

    const holderMap = new Map<string, { name: string; cedula: string }>()
    for (const row of holdersRaw ?? []) {
      const inv = row.investor as { full_name: string; cedula: string } | null
      if (inv) holderMap.set(row.contract_id, { name: inv.full_name, cedula: inv.cedula })
    }

    const results: Array<{
      contract_id: string
      report_id?: string
      error?: string
    }> = []

    const { generateReportPdf } = await import('@/lib/pdf/generate-report-pdf')

    for (const contract of contractsRaw) {
      try {
        const calculatedAmount = (contract.amount * growthRate) / 100
        const plan = contract.investment_plans as
          | { name: string; type: string }
          | null
        const holder = holderMap.get(contract.id)

        // Create the report row
        const { data: report, error: insertError } = await supabase
          .from('reports')
          .insert({
            contract_id: contract.id,
            period_start: body.period_start,
            period_end: body.period_end,
            growth_rate: growthRate,
            calculated_amount: calculatedAmount,
            description: body.description ?? null,
            status: 'pending',
          })
          .select('id')
          .single()

        if (insertError || !report) {
          results.push({
            contract_id: contract.id,
            error: insertError?.message ?? 'Error al crear el reporte',
          })
          continue
        }

        // Generate PDF
        if (plan && holder) {
          try {
            const pdfBuffer = await generateReportPdf({
              report_id: report.id,
              contract_id: contract.id,
              investor_name: holder.name,
              investor_cedula: holder.cedula,
              plan_name: plan.name,
              plan_type: plan.type,
              capital_invertido: contract.amount,
              period_start: body.period_start,
              period_end: body.period_end,
              growth_rate: growthRate,
              calculated_amount: calculatedAmount,
              description: body.description ?? null,
              generated_at: new Date().toISOString(),
            })

            const storagePath = `${contract.id}/report_${report.id}_${Date.now()}.pdf`
            const { error: uploadError } = await storageClient.storage
              .from('contracts')
              .upload(storagePath, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: false,
              })

            if (!uploadError) {
              await supabase
                .from('reports')
                .update({ pdf_path: storagePath, status: 'generated' })
                .eq('id', report.id)

              await supabase.from('contract_documents').insert({
                contract_id: contract.id,
                type: 'report',
                file_name: `reporte-${report.id.slice(0, 8)}.pdf`,
                storage_path: storagePath,
                file_size: pdfBuffer.length,
                mime_type: 'application/pdf',
              })
            }
          } catch (pdfErr) {
            console.error('[reports/batch] PDF error for', contract.id, pdfErr)
          }
        }

        results.push({ contract_id: contract.id, report_id: report.id })
      } catch (err) {
        console.error('[reports/batch] error for', contract.id, err)
        results.push({
          contract_id: contract.id,
          error: err instanceof Error ? err.message : 'Error inesperado',
        })
      }
    }

    const successCount = results.filter((r) => r.report_id).length
    const errorCount = results.filter((r) => r.error).length

    return NextResponse.json({
      success: true,
      created: successCount,
      failed: errorCount,
      results,
    })
  } catch (err) {
    console.error('[reports/batch] Unhandled error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
