import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')

    let query = supabase
      .from('investors')
      .select(`
        *,
        primary_email:investor_emails!inner(email)
      `)
      .eq('investor_emails.is_primary', true)
      .order('full_name', { ascending: true })

    if (status === 'active' || status === 'inactive') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,cedula.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Flatten primary_email array to single value
    const investors = (data ?? []).map((row) => {
      const emailArr = row.primary_email as { email: string }[] | null
      return {
        ...row,
        primary_email: emailArr?.[0]?.email ?? null,
      }
    })

    return NextResponse.json({ investors })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const body = await request.json()

    const { full_name, cedula, phone, email, referrer_id } = body

    if (!full_name || !cedula || !email) {
      return NextResponse.json(
        { error: 'Nombre completo, cédula y email son requeridos' },
        { status: 400 }
      )
    }

    // Insert investor
    const { data: investor, error: investorError } = await supabase
      .from('investors')
      .insert({
        full_name: full_name.trim(),
        cedula: cedula.trim(),
        phone: phone?.trim() || null,
        referrer_id: referrer_id || null,
        status: 'active',
      })
      .select()
      .single()

    if (investorError) {
      if (investorError.code === '23505') {
        return NextResponse.json(
          { error: 'Ya existe un inversionista con esa cédula' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: investorError.message }, { status: 500 })
    }

    // Insert primary email
    const { error: emailError } = await supabase
      .from('investor_emails')
      .insert({
        investor_id: investor.id,
        email: email.trim().toLowerCase(),
        is_primary: true,
        verified: false,
      })

    if (emailError) {
      // Rollback investor if email insert fails
      await supabase.from('investors').delete().eq('id', investor.id)
      return NextResponse.json({ error: emailError.message }, { status: 500 })
    }

    // Notify other admins of new investor creation
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const authClient = await createClient()
      const { data: { user: actor } } = await authClient.auth.getUser()

      const { notifyAdmins } = await import('@/lib/notifications/notify-admins')
      await notifyAdmins({
        supabase,
        type: 'approval',
        channel: 'internal',
        title: 'Nuevo inversionista registrado',
        body: `${investor.full_name} (cédula ${investor.cedula}) fue registrado en el sistema.`,
        investor_id: investor.id,
        exclude_user_id: actor?.id,
      })
    } catch (notifErr) {
      console.error('[investors] notify error:', notifErr)
    }

    return NextResponse.json({ investor }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
