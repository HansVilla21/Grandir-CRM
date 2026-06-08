import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)
    const planId = searchParams.get('plan_id')

    if (!planId) {
      return NextResponse.json({ error: 'plan_id es requerido' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('contract_templates')
      .select('id, name, content, version')
      .eq('plan_id', planId)
      .eq('active', true)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ templates: data ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
