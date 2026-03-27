import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createAdminClient()

    // Investor + all emails
    const { data: investor, error: investorError } = await supabase
      .from('investors')
      .select(`
        *,
        emails:investor_emails(id, email, is_primary, verified, created_at),
        referrer:investors!investors_referrer_id_fkey(id, full_name)
      `)
      .eq('id', id)
      .single()

    if (investorError) {
      if (investorError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Inversionista no encontrado' }, { status: 404 })
      }
      return NextResponse.json({ error: investorError.message }, { status: 500 })
    }

    // Contracts via contract_investors
    const { data: contractInvestors, error: contractError } = await supabase
      .from('contract_investors')
      .select(`
        id,
        role,
        approval_status,
        contracts:contract_id(
          id,
          amount,
          status,
          start_date,
          end_date,
          term_months,
          plan:plan_id(id, name, type)
        )
      `)
      .eq('investor_id', id)

    if (contractError) {
      return NextResponse.json({ error: contractError.message }, { status: 500 })
    }

    return NextResponse.json({
      investor,
      contractInvestors: contractInvestors ?? [],
    })
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

    const allowedFields = ['full_name', 'phone', 'status', 'cedula', 'referrer_id']
    const updates: Record<string, string | null> = {}

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field] === '' ? null : body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const { data: investor, error } = await supabase
      .from('investors')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Ya existe un inversionista con esa cédula' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ investor })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
