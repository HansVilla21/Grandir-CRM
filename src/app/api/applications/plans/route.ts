import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServiceClient()

  const { data: plans, error } = await supabase
    .from('investment_plans')
    .select('id, name, type, annual_rate, min_amount, description')
    .eq('active', true)
    .order('min_amount', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Error al cargar los planes' }, { status: 500 })
  }

  return NextResponse.json({ plans: plans ?? [] })
}
