import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import type { ContractStatus } from '@/types/contracts'

// Valid state transitions
const ALLOWED_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  draft: ['pending_approval'],
  pending_approval: ['active', 'revision_requested'],
  revision_requested: ['draft', 'cancelled'],
  active: ['expired', 'cancelled'],
  expired: [],
  cancelled: [],
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createAdminClient()

    // Contract + plan
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        *,
        plan:investment_plans(id, name, type, annual_rate, min_amount)
      `)
      .eq('id', id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }

    // contract_investors with investor data
    const { data: contractInvestors, error: ciError } = await supabase
      .from('contract_investors')
      .select(`
        *,
        investor:investors(
          full_name, cedula,
          emails:investor_emails(email, is_primary)
        )
      `)
      .eq('contract_id', id)

    if (ciError) {
      return NextResponse.json({ error: ciError.message }, { status: 500 })
    }

    // Payments ordered by date desc
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('contract_id', id)
      .order('payment_date', { ascending: false })

    if (paymentsError) {
      return NextResponse.json({ error: paymentsError.message }, { status: 500 })
    }

    // Documents ordered by created_at desc
    const { data: documents, error: docsError } = await supabase
      .from('contract_documents')
      .select('*')
      .eq('contract_id', id)
      .order('created_at', { ascending: false })

    if (docsError) {
      return NextResponse.json({ error: docsError.message }, { status: 500 })
    }

    // Reports
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('*')
      .eq('contract_id', id)
      .order('period_start', { ascending: false })

    if (reportsError) {
      return NextResponse.json({ error: reportsError.message }, { status: 500 })
    }

    const result = {
      ...contract,
      contract_investors: contractInvestors ?? [],
      payments: payments ?? [],
      contract_documents: documents ?? [],
      reports: reports ?? [],
    }

    return NextResponse.json({ contract: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createAdminClient()
    const body = await request.json()

    // Fetch current contract
    const { data: current, error: fetchError } = await supabase
      .from('contracts')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }

    // Case 1: status transition
    if ('status' in body) {
      const newStatus = body.status as ContractStatus
      const allowed = ALLOWED_TRANSITIONS[current.status as ContractStatus] ?? []

      if (!allowed.includes(newStatus)) {
        return NextResponse.json(
          {
            error: `Transición no permitida: ${current.status} → ${newStatus}`,
          },
          { status: 422 }
        )
      }

      const updatePayload: Record<string, unknown> = { status: newStatus }

      // If transitioning to active, set start_date if missing
      if (newStatus === 'active') {
        const { data: full } = await supabase
          .from('contracts')
          .select('start_date, term_months')
          .eq('id', id)
          .single()

        if (full && !full.start_date) {
          const startDate = new Date()
          const endDate = new Date(startDate)
          endDate.setMonth(endDate.getMonth() + full.term_months)
          updatePayload.start_date = startDate.toISOString().split('T')[0]
          updatePayload.end_date = endDate.toISOString().split('T')[0]
        } else if (full && full.start_date) {
          const startDate = new Date(full.start_date)
          const endDate = new Date(startDate)
          endDate.setMonth(endDate.getMonth() + full.term_months)
          updatePayload.end_date = endDate.toISOString().split('T')[0]
        }
      }

      const { data: updated, error: updateError } = await supabase
        .from('contracts')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ contract: updated })
    }

    // Case 2: field update (only allowed in draft or revision_requested)
    if (current.status !== 'draft' && current.status !== 'revision_requested') {
      return NextResponse.json(
        { error: 'Solo se pueden editar contratos en borrador o revisión solicitada' },
        { status: 422 }
      )
    }

    const allowedFields = ['amount', 'term_months', 'start_date', 'notes'] as const
    const updatePayload: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in body) {
        updatePayload[field] = body[field]
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('contracts')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ contract: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
