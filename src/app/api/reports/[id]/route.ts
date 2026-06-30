import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireInternalUser } from '@/lib/auth/guard'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireInternalUser()
    if (response) return response

    const { id } = await params
    const supabase = createServiceClient()

    const { data: report, error } = await supabase
      .from('reports')
      .select(`
        *,
        contracts (
          amount,
          investment_plans (name)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !report) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    // Holder name
    const { data: holderRow } = await supabase
      .from('contract_investors')
      .select('investors(full_name)')
      .eq('contract_id', report.contract_id)
      .eq('role', 'holder')
      .single()

    const holder = holderRow?.investors as { full_name: string } | null
    const contract = report.contracts as {
      amount: number
      investment_plans: { name: string } | null
    } | null

    // All investor emails for this contract
    const { data: contractInvestors } = await supabase
      .from('contract_investors')
      .select('investors(investor_emails(email, is_primary))')
      .eq('contract_id', report.contract_id)

    const recipientEmails: string[] = []
    for (const ci of contractInvestors ?? []) {
      const inv = ci.investors as {
        investor_emails: { email: string; is_primary: boolean }[]
      } | null
      for (const emailRow of inv?.investor_emails ?? []) {
        if (!recipientEmails.includes(emailRow.email)) {
          recipientEmails.push(emailRow.email)
        }
      }
    }

    return NextResponse.json({
      id: report.id,
      contract_id: report.contract_id,
      period_start: report.period_start,
      period_end: report.period_end,
      growth_rate: report.growth_rate,
      calculated_amount: report.calculated_amount,
      description: report.description,
      pdf_path: report.pdf_path,
      status: report.status,
      sent_at: report.sent_at,
      sent_to: report.sent_to,
      created_at: report.created_at,
      updated_at: report.updated_at,
      holder_name: holder?.full_name ?? '—',
      plan_name: contract?.investment_plans?.name ?? '—',
      contract_amount: contract?.amount ?? 0,
      recipient_emails: recipientEmails,
    })
  } catch (err) {
    console.error('GET /api/reports/[id] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireInternalUser()
    if (response) return response

    const { id } = await params
    const supabase = createServiceClient()

    // Check current status
    const { data: existing, error: fetchError } = await supabase
      .from('reports')
      .select('status')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    if (existing.status === 'sent') {
      return NextResponse.json(
        { error: 'No se puede editar un reporte ya enviado' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const allowed = ['description', 'growth_rate', 'calculated_amount']
    const updates: Record<string, unknown> = {}

    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Sin campos para actualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('reports')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('PATCH /api/reports/[id] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
