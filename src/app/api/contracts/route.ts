import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { ContractStatus } from '@/types/contracts'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const planId = searchParams.get('plan_id')
    const search = searchParams.get('search')

    // Fetch contracts with plan info
    let query = supabase
      .from('contracts')
      .select(`
        id, amount, plan_id, status, term_months, start_date, end_date, created_at,
        plan:investment_plans(id, name, type, annual_rate, min_amount)
      `)
      .order('created_at', { ascending: false })

    if (statusParam) {
      query = query.eq('status', statusParam as ContractStatus)
    }

    if (planId) {
      query = query.eq('plan_id', planId)
    }

    const { data: contractsRaw, error: contractsError } = await query

    if (contractsError) {
      return NextResponse.json({ error: contractsError.message }, { status: 500 })
    }

    const contracts = contractsRaw ?? []

    if (contracts.length === 0) {
      return NextResponse.json({ contracts: [] })
    }

    // Fetch holders for all contracts in one query
    const contractIds = contracts.map((c) => c.id)

    const { data: holdersRaw, error: holdersError } = await supabase
      .from('contract_investors')
      .select(`
        contract_id,
        investor:investors(full_name)
      `)
      .in('contract_id', contractIds)
      .eq('role', 'holder')

    if (holdersError) {
      return NextResponse.json({ error: holdersError.message }, { status: 500 })
    }

    // Build holder lookup map
    const holderMap = new Map<string, string | null>()
    for (const row of holdersRaw ?? []) {
      const inv = row.investor as { full_name: string } | null
      holderMap.set(row.contract_id, inv?.full_name ?? null)
    }

    // Compose list items
    const result = contracts
      .map((c) => {
        const plan = c.plan as { id: string; name: string; type: string; annual_rate: number; min_amount: number } | null
        const holderName = holderMap.get(c.id) ?? null

        // Apply search filter after join (search on holder name)
        if (search) {
          const q = search.toLowerCase()
          if (!holderName?.toLowerCase().includes(q)) return null
        }

        return {
          id: c.id,
          plan_id: c.plan_id,
          plan_name: plan?.name ?? '',
          plan_type: plan?.type ?? '',
          holder_name: holderName,
          amount: c.amount,
          status: c.status,
          term_months: c.term_months,
          start_date: c.start_date,
          end_date: c.end_date,
          created_at: c.created_at,
        }
      })
      .filter(Boolean)

    return NextResponse.json({ contracts: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const body = await request.json()

    const {
      plan_id,
      investor_id,
      amount,
      term_months,
      start_date,
      notes,
      report_frequency_months,
      template_id,
      rendered_content,
    } = body

    // Basic validation
    if (!plan_id || !investor_id || !amount || !term_months) {
      return NextResponse.json(
        { error: 'plan_id, investor_id, amount y term_months son requeridos' },
        { status: 400 }
      )
    }

    // Fetch plan to validate min_amount
    const { data: plan, error: planError } = await supabase
      .from('investment_plans')
      .select('id, min_amount, active')
      .eq('id', plan_id)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }

    if (!plan.active) {
      return NextResponse.json({ error: 'El plan seleccionado no está activo' }, { status: 400 })
    }

    if (amount < plan.min_amount) {
      return NextResponse.json(
        {
          error: `El monto mínimo para este plan es ${new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(plan.min_amount)}`,
        },
        { status: 400 }
      )
    }

    // Verify investor exists
    const { data: investor, error: investorError } = await supabase
      .from('investors')
      .select('id')
      .eq('id', investor_id)
      .single()

    if (investorError || !investor) {
      return NextResponse.json({ error: 'Inversionista no encontrado' }, { status: 404 })
    }

    // Create contract
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert({
        plan_id,
        amount: Number(amount),
        term_months: Number(term_months),
        start_date: start_date || null,
        notes: notes?.trim() || null,
        report_frequency_months: report_frequency_months ?? 2,
        status: 'draft',
        version: 1,
        template_id: template_id || null,
        rendered_content: rendered_content || null,
      })
      .select()
      .single()

    if (contractError) {
      return NextResponse.json({ error: contractError.message }, { status: 500 })
    }

    // Create contract_investor (holder)
    const portalToken = crypto.randomUUID()
    const tokenExpiresAt = new Date()
    tokenExpiresAt.setFullYear(tokenExpiresAt.getFullYear() + 1)

    const { error: ciError } = await supabase.from('contract_investors').insert({
      contract_id: contract.id,
      investor_id,
      role: 'holder',
      approval_status: 'pending',
      portal_token: portalToken,
      token_expires_at: tokenExpiresAt.toISOString(),
    })

    if (ciError) {
      // Best-effort rollback
      await supabase.from('contracts').delete().eq('id', contract.id)
      return NextResponse.json({ error: ciError.message }, { status: 500 })
    }

    // Notify other admins of new contract
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const authClient = await createClient()
      const { data: { user: actor } } = await authClient.auth.getUser()

      const { data: holderInfo } = await supabase
        .from('investors')
        .select('full_name')
        .eq('id', investor_id)
        .single()

      const { notifyAdmins } = await import('@/lib/notifications/notify-admins')
      const formattedAmount = `$${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
      await notifyAdmins({
        supabase,
        type: 'approval',
        channel: 'internal',
        title: 'Nuevo contrato creado',
        body: `Contrato #${contract.id.slice(0, 8).toUpperCase()} por ${formattedAmount} a nombre de ${holderInfo?.full_name ?? 'inversionista'}.`,
        contract_id: contract.id,
        investor_id,
        exclude_user_id: actor?.id,
      })
    } catch (notifErr) {
      console.error('[contracts/POST] notify error:', notifErr)
    }

    return NextResponse.json({ contract }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
