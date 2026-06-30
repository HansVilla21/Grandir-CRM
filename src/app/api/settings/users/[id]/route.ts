import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/guard'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profile, response } = await requireAdmin()
    if (response) return response

    const { id } = await params
    const body = await request.json()
    const { full_name, role, active } = body as {
      full_name?: string
      role?: 'admin' | 'assistant'
      active?: boolean
    }

    if (role !== undefined && role !== 'admin' && role !== 'assistant') {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }

    // Safeguard: no permitir auto-desactivación ni auto-cambio de rol del propio admin.
    if (id === profile.id && (active === false || (role && role !== 'admin'))) {
      return NextResponse.json(
        { error: 'No podés desactivar ni cambiar el rol de tu propia cuenta.' },
        { status: 400 }
      )
    }

    // Safeguard: no dejar el sistema sin al menos un admin activo.
    // Solo aplica si el objetivo ES hoy un admin activo y el cambio le quita ese estado.
    if (active === false || (role && role !== 'admin')) {
      const adminCheck = createServiceClient()
      const { data: target } = await adminCheck
        .from('user_profiles')
        .select('role, active')
        .eq('id', id)
        .single()
      const wasActiveAdmin = target?.role === 'admin' && target?.active === true
      if (wasActiveAdmin) {
        const { count } = await adminCheck
          .from('user_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'admin')
          .eq('active', true)
          .neq('id', id)
        if ((count ?? 0) === 0) {
          return NextResponse.json(
            { error: 'Debe quedar al menos un administrador activo.' },
            { status: 400 }
          )
        }
      }
    }

    const updates: Record<string, unknown> = {}
    if (full_name !== undefined) updates.full_name = full_name
    if (role !== undefined) updates.role = role
    if (active !== undefined) updates.active = active

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ user: data })
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
    const { profile, response } = await requireAdmin()
    if (response) return response

    const { id } = await params

    // Safeguard: no permitir desactivar la propia cuenta.
    if (id === profile.id) {
      return NextResponse.json(
        { error: 'No podés desactivar tu propia cuenta.' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Safeguard: no dejar el sistema sin al menos un admin activo.
    // Solo aplica si el objetivo ES hoy un admin activo (desactivar un asistente no afecta).
    const { data: target } = await supabase
      .from('user_profiles')
      .select('role, active')
      .eq('id', id)
      .single()
    if (target?.role === 'admin' && target?.active === true) {
      const { count } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('active', true)
        .neq('id', id)
      if ((count ?? 0) === 0) {
        return NextResponse.json(
          { error: 'Debe quedar al menos un administrador activo.' },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ active: false })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ user: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
