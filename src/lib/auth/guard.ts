import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export type InternalProfile = {
  id: string
  full_name: string
  role: 'admin' | 'assistant'
  active: boolean
}

export type GuardResult =
  | { profile: InternalProfile; response: null }
  | { profile: null; response: NextResponse }

/** Lee la sesión (cookies) y el perfil interno vía service-role (evita depender de RLS para autorizar). */
async function loadProfile(): Promise<InternalProfile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createServiceClient()
  const { data } = await admin
    .from('user_profiles')
    .select('id, full_name, role, active')
    .eq('id', user.id)
    .single()

  return (data as InternalProfile | null) ?? null
}

/** 401 si no hay sesión/perfil; 403 si está inactivo. Devuelve el perfil si es usuario interno activo. */
export async function requireInternalUser(): Promise<GuardResult> {
  const profile = await loadProfile()
  if (!profile) {
    return { profile: null, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }
  if (!profile.active) {
    return { profile: null, response: NextResponse.json({ error: 'Cuenta inactiva' }, { status: 403 }) }
  }
  return { profile, response: null }
}

/** Como requireInternalUser pero exige rol admin (403 si no). */
export async function requireAdmin(): Promise<GuardResult> {
  const result = await requireInternalUser()
  if (result.response) return result
  if (result.profile.role !== 'admin') {
    return { profile: null, response: NextResponse.json({ error: 'Requiere rol de administrador' }, { status: 403 }) }
  }
  return result
}
