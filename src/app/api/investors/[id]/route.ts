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

    let investor = null
    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase
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
      investor = data
    }

    // Update primary email (if provided)
    if ('email' in body) {
      const newEmail = body.email ? String(body.email).trim().toLowerCase() : null

      if (newEmail) {
        // Validate format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
          return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
        }

        // Find current primary email
        const { data: primaryRows } = await supabase
          .from('investor_emails')
          .select('id, email')
          .eq('investor_id', id)
          .eq('is_primary', true)
          .limit(1)

        const currentPrimary = primaryRows?.[0]
        if (currentPrimary) {
          if (currentPrimary.email !== newEmail) {
            const { error: updateEmailError } = await supabase
              .from('investor_emails')
              .update({ email: newEmail })
              .eq('id', currentPrimary.id)

            if (updateEmailError) {
              return NextResponse.json(
                { error: `Error al actualizar email: ${updateEmailError.message}` },
                { status: 500 }
              )
            }
          }
        } else {
          // No primary exists — create one
          const { error: insertEmailError } = await supabase
            .from('investor_emails')
            .insert({
              investor_id: id,
              email: newEmail,
              is_primary: true,
              verified: false,
            })

          if (insertEmailError) {
            return NextResponse.json(
              { error: `Error al crear email: ${insertEmailError.message}` },
              { status: 500 }
            )
          }
        }
      }

      // If investor wasn't updated (only email changed), fetch fresh data
      if (!investor) {
        const { data } = await supabase.from('investors').select().eq('id', id).single()
        investor = data
      }
    }

    if (!investor && Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    return NextResponse.json({ investor })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createAdminClient()

    // Check if investor has active contracts
    const { count } = await supabase
      .from('contract_investors')
      .select('id', { count: 'exact', head: true })
      .eq('investor_id', id)

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar un inversionista con contratos asociados. Elimine los contratos primero.' },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('investors')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
