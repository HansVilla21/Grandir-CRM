import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
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
    let holderMap = new Map<string, string>()

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
    const supabase = await createAdminClient()
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

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('POST /api/reports error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
