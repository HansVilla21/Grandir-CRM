import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

interface DueReport {
  contract_id: string
  holder_name: string | null
  plan_name: string
  contract_start_date: string | null
  report_frequency_months: number
  last_report_period_end: string | null
  next_report_due_date: string // ISO date
  days_overdue: number // negative if not due yet
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * GET /api/reports/due
 *
 * Devuelve los contratos activos que necesitan un nuevo reporte:
 * - Si nunca tuvo reporte → fecha esperada = start_date + frequency
 * - Si ya tiene reportes → fecha esperada = último period_end + frequency
 *
 * Considera "vencido" si la fecha esperada ya pasó.
 */
export async function GET() {
  try {
    const supabase = await createAdminClient()
    const today = new Date()

    // 1. Active contracts with frequency
    const { data: contracts } = await supabase
      .from('contracts')
      .select(`
        id, start_date, report_frequency_months,
        investment_plans (name)
      `)
      .eq('status', 'active')

    if (!contracts || contracts.length === 0) {
      return NextResponse.json({ items: [] })
    }

    const contractIds = contracts.map((c) => c.id)

    // 2. Latest report per contract
    const { data: reports } = await supabase
      .from('reports')
      .select('contract_id, period_end')
      .in('contract_id', contractIds)
      .order('period_end', { ascending: false })

    const lastReportByContract = new Map<string, string>()
    for (const r of reports ?? []) {
      if (!lastReportByContract.has(r.contract_id)) {
        lastReportByContract.set(r.contract_id, r.period_end)
      }
    }

    // 3. Holders
    const { data: holdersRaw } = await supabase
      .from('contract_investors')
      .select('contract_id, investor:investors(full_name)')
      .in('contract_id', contractIds)
      .eq('role', 'holder')

    const holderMap = new Map<string, string | null>()
    for (const row of holdersRaw ?? []) {
      const inv = row.investor as { full_name: string } | null
      holderMap.set(row.contract_id, inv?.full_name ?? null)
    }

    // 4. Compute next-report-due for each contract
    const items: DueReport[] = []
    for (const c of contracts) {
      if (!c.start_date) continue

      const lastPeriodEnd = lastReportByContract.get(c.id)
      const baseDate = lastPeriodEnd
        ? new Date(lastPeriodEnd)
        : new Date(c.start_date)

      const nextDue = addMonths(baseDate, c.report_frequency_months)
      const daysOverdue = daysBetween(today, nextDue)

      const plan = c.investment_plans as { name: string } | null

      items.push({
        contract_id: c.id,
        holder_name: holderMap.get(c.id) ?? null,
        plan_name: plan?.name ?? '—',
        contract_start_date: c.start_date,
        report_frequency_months: c.report_frequency_months,
        last_report_period_end: lastPeriodEnd ?? null,
        next_report_due_date: nextDue.toISOString().slice(0, 10),
        days_overdue: daysOverdue,
      })
    }

    // Sort: most overdue first
    items.sort((a, b) => b.days_overdue - a.days_overdue)

    return NextResponse.json({ items })
  } catch (err) {
    console.error('[reports/due] Error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
