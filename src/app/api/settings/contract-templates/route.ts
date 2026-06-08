import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { defaultContentForPlanType } from '@/lib/contract-templates/default-content'

export async function GET() {
  try {
    const supabase = await createAdminClient()

    const { data: templates, error } = await supabase
      .from('contract_templates')
      .select(`
        id, plan_id, name, version, content, active, created_at, updated_at,
        plan:investment_plans(name, type)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const ids = (templates ?? []).map((t) => t.id)
    const usageMap = new Map<string, number>()

    if (ids.length > 0) {
      const { data: usage } = await supabase
        .from('contracts')
        .select('template_id')
        .in('template_id', ids)

      for (const row of usage ?? []) {
        if (!row.template_id) continue
        usageMap.set(row.template_id, (usageMap.get(row.template_id) ?? 0) + 1)
      }
    }

    const result = (templates ?? []).map((t) => {
      const plan = t.plan as { name: string; type: string } | null
      return {
        id: t.id,
        plan_id: t.plan_id,
        plan_name: plan?.name ?? '—',
        name: t.name,
        version: t.version,
        content: t.content,
        active: t.active,
        created_at: t.created_at,
        updated_at: t.updated_at,
        in_use_count: usageMap.get(t.id) ?? 0,
      }
    })

    return NextResponse.json({ templates: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminSupabase = await createAdminClient()
    const authClient = await createClient()

    const {
      data: { user },
    } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const action = body.action as string | undefined

    // ---------------------------------------------------------------------
    // Special action: generate default templates for every plan that doesn't
    // already have one. Used to seed the system with the original machotes.
    // ---------------------------------------------------------------------
    if (action === 'seed_defaults') {
      const { data: plans, error: plansError } = await adminSupabase
        .from('investment_plans')
        .select('id, name, type')
        .eq('active', true)

      if (plansError) {
        return NextResponse.json({ error: plansError.message }, { status: 500 })
      }

      const { data: existing } = await adminSupabase
        .from('contract_templates')
        .select('plan_id')

      const existingPlanIds = new Set((existing ?? []).map((e) => e.plan_id))

      const toInsert = (plans ?? [])
        .filter((p) => !existingPlanIds.has(p.id))
        .map((p) => ({
          plan_id: p.id,
          name: `${p.name} — Plantilla base`,
          version: 1,
          content: defaultContentForPlanType(p.type as 'annual' | 'monthly' | 'semestral'),
          active: true,
        }))

      if (toInsert.length === 0) {
        return NextResponse.json({
          created: 0,
          message: 'Todos los planes activos ya tienen plantilla.',
        })
      }

      const { data: inserted, error: insertError } = await adminSupabase
        .from('contract_templates')
        .insert(toInsert)
        .select()

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      return NextResponse.json({ created: inserted?.length ?? 0, templates: inserted })
    }

    // ---------------------------------------------------------------------
    // Default action: create a new template
    // ---------------------------------------------------------------------
    const { plan_id, name, content, active } = body as {
      plan_id?: string
      name?: string
      content?: string
      active?: boolean
    }

    if (!plan_id || !name?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: 'plan_id, name y content son requeridos' },
        { status: 400 }
      )
    }

    const { data: template, error } = await adminSupabase
      .from('contract_templates')
      .insert({
        plan_id,
        name: name.trim(),
        content,
        active: active ?? true,
        version: 1,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ template }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
