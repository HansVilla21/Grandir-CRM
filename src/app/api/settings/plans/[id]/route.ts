import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, annual_rate, min_amount, active, description, valid_from, valid_to } =
      body as {
        name?: string
        annual_rate?: number
        min_amount?: number
        active?: boolean
        description?: string
        valid_from?: string | null
        valid_to?: string | null
      }

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (annual_rate !== undefined) updates.annual_rate = annual_rate
    if (min_amount !== undefined) updates.min_amount = min_amount
    if (active !== undefined) updates.active = active
    if (description !== undefined) updates.description = description
    if (valid_from !== undefined) updates.valid_from = valid_from
    if (valid_to !== undefined) updates.valid_to = valid_to

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('investment_plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ plan: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
