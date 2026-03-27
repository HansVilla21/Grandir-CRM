import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createAdminClient()

    // Fetch auth users list
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // Fetch all user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: true })

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    // Merge auth users with profiles
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

    const users = (authData.users ?? [])
      .filter((u) => profileMap.has(u.id))
      .map((u) => {
        const profile = profileMap.get(u.id)!
        return {
          id: u.id,
          email: u.email ?? '',
          full_name: profile.full_name,
          role: profile.role,
          active: profile.active,
          created_at: profile.created_at,
        }
      })

    return NextResponse.json({ users })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, full_name, role } = body as {
      email: string
      password: string
      full_name: string
      role: 'admin' | 'assistant'
    }

    if (!email || !password || !full_name || !role) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      )
    }

    if (role !== 'admin' && role !== 'assistant') {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Create in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authUser.user.id

    // Insert profile
    const { error: profileError } = await supabase.from('user_profiles').insert({
      id: userId,
      full_name,
      role,
      active: true,
    })

    if (profileError) {
      // Rollback auth user
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        user: {
          id: userId,
          email,
          full_name,
          role,
          active: true,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
