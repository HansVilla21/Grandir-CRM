import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminSupabase = await createAdminClient()
    const authClient = await createClient()

    const {
      data: { user },
    } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { name, content, active, plan_id } = body as {
      name?: string
      content?: string
      active?: boolean
      plan_id?: string
    }

    const updates: Record<string, unknown> = {}
    if (typeof name === 'string') updates.name = name.trim()
    if (typeof content === 'string') updates.content = content
    if (typeof active === 'boolean') updates.active = active
    if (typeof plan_id === 'string' && plan_id) updates.plan_id = plan_id

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay cambios para aplicar' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { data: template, error } = await adminSupabase
      .from('contract_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ template })
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
    const adminSupabase = await createAdminClient()
    const authClient = await createClient()

    const {
      data: { user },
    } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Block deletion if template is used by any contract
    const { count, error: countError } = await adminSupabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('template_id', id)

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar — esta plantilla está siendo usada por ${count} contrato(s). Desactívala en su lugar.`,
        },
        { status: 400 }
      )
    }

    const { error } = await adminSupabase
      .from('contract_templates')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ deleted: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
