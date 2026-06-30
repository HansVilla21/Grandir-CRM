import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireInternalUser, requireAdmin } from '@/lib/auth/guard'
import type { Json } from '@/types/database'

type PlanType = 'annual' | 'monthly' | 'semestral'

function buildPaymentStructure(type: PlanType): Json {
  switch (type) {
    case 'annual':
      return { type: 'single_payment', pay_at: 'on_maturity' }
    case 'monthly':
      return {
        type: 'monthly',
        starts_at_month: 3,
        monthly_rate: 10.0,
        remainder: 'on_maturity',
      }
    case 'semestral':
      return {
        type: 'semestral',
        semestral_rate: 40.0,
        remainder: 'on_maturity',
      }
  }
}

export async function GET() {
  try {
    const { response } = await requireInternalUser()
    if (response) return response

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('investment_plans')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ plans: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireAdmin()
    if (response) return response

    const body = await request.json()
    const { name, type, annual_rate, min_amount, description, valid_from, valid_to } =
      body as {
        name: string
        type: PlanType
        annual_rate: number
        min_amount: number
        description?: string
        valid_from?: string
        valid_to?: string
      }

    if (!name || !type || annual_rate === undefined || min_amount === undefined) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const validTypes: PlanType[] = ['annual', 'monthly', 'semestral']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Tipo de plan inválido' }, { status: 400 })
    }

    const payment_structure = buildPaymentStructure(type)

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('investment_plans')
      .insert({
        name,
        type,
        annual_rate,
        min_amount,
        payment_structure,
        description: description ?? null,
        valid_from: valid_from ?? null,
        valid_to: valid_to ?? null,
        active: true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ plan: data }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
