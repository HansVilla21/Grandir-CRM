import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { calculateInvestment, type PlanType } from '@/lib/investment/calculator'
import type { NotificationType } from '@/types/notifications'

/**
 * POST /api/notifications/scan
 *
 * Detecta eventos basados en tiempo y genera notificaciones in-app para todos los admins.
 * Idempotente: usa una "key" (type + contract_id + período) para evitar duplicar.
 *
 * Eventos detectados:
 * 1. Contratos próximos a vencer (30 días antes del end_date)
 * 2. Próximos desembolsos del cronograma (7 días antes)
 * 3. Reportes vencidos (último reporte + frecuencia ya pasó)
 * 4. Procesos demorados (start_date pasó pero contrato aún no activo)
 * 5. Desembolsos atrasados (fecha del cronograma pasó sin pago registrado)
 */

const DAYS_BEFORE_EXPIRATION = 30
const DAYS_BEFORE_DISBURSEMENT = 7
const DEDUP_WINDOW_DAYS = 30 // No duplicar notificaciones del mismo tipo/contrato en N días

interface NotifKey {
  type: NotificationType
  contract_id: string
  body_hash: string // para distinguir múltiples notifs del mismo tipo por mismo contrato
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

function todayStart(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase()
}

export async function POST() {
  try {
    const supabase = await createAdminClient()
    const today = todayStart()

    // Get admin recipients
    const { data: admins } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'admin')

    if (!admins || admins.length === 0) {
      return NextResponse.json({ created: 0, message: 'Sin admins activos' })
    }

    // Get existing recent notifications to dedupe
    const dedupSince = new Date(today.getTime() - DEDUP_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    const { data: existingNotifs } = await supabase
      .from('notifications')
      .select('type, contract_id, body')
      .gte('created_at', dedupSince.toISOString())

    const existingKeys = new Set<string>()
    for (const n of existingNotifs ?? []) {
      if (n.contract_id) {
        existingKeys.add(`${n.type}::${n.contract_id}::${n.body ?? ''}`)
      }
    }

    function isDuplicate(key: NotifKey): boolean {
      return existingKeys.has(`${key.type}::${key.contract_id}::${key.body_hash}`)
    }

    const toCreate: Array<{
      type: NotificationType
      title: string
      body: string
      contract_id: string
      investor_id?: string | null
    }> = []

    // Fetch active contracts with plan + holder for all checks
    const { data: contracts } = await supabase
      .from('contracts')
      .select(`
        id, amount, status, start_date, end_date, term_months, report_frequency_months,
        investment_plans (name, type, annual_rate)
      `)

    if (!contracts) {
      return NextResponse.json({ created: 0 })
    }

    const contractIds = contracts.map((c) => c.id)
    const { data: holdersRaw } = await supabase
      .from('contract_investors')
      .select('contract_id, investor_id, investor:investors(full_name)')
      .in('contract_id', contractIds)
      .eq('role', 'holder')

    const holderMap = new Map<string, { id: string; name: string }>()
    for (const row of holdersRaw ?? []) {
      const inv = row.investor as { full_name: string } | null
      if (inv) {
        holderMap.set(row.contract_id, { id: row.investor_id, name: inv.full_name })
      }
    }

    // Latest reports per contract
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

    // All withdrawal payments
    const { data: payments } = await supabase
      .from('payments')
      .select('contract_id, amount, payment_date, type')
      .in('contract_id', contractIds)

    // === SCAN ===
    for (const c of contracts) {
      const plan = c.investment_plans as
        | { name: string; type: string; annual_rate: number }
        | null
      const holder = holderMap.get(c.id)
      if (!plan || !holder) continue

      // ---- 4. PROCESO DEMORADO (start_date pasó pero contrato no activo) ----
      if (
        ['draft', 'pending_approval', 'revision_requested'].includes(c.status) &&
        c.start_date
      ) {
        const startDate = new Date(c.start_date)
        if (startDate < today) {
          const days = daysBetween(today, startDate)
          const body = `La fecha de inicio del contrato #${shortId(c.id)} (${holder.name}) llegó hace ${days} día${days !== 1 ? 's' : ''} pero sigue en estado "${c.status}".`
          const key: NotifKey = { type: 'process_delayed', contract_id: c.id, body_hash: body }
          if (!isDuplicate(key)) {
            toCreate.push({
              type: 'process_delayed',
              title: 'Proceso de contrato demorado',
              body,
              contract_id: c.id,
              investor_id: holder.id,
            })
            existingKeys.add(`${key.type}::${key.contract_id}::${key.body_hash}`)
          }
        }
      }

      // Solo seguimos con contratos activos para el resto
      if (c.status !== 'active' || !c.start_date) continue

      // ---- 1. CONTRATO PRÓXIMO A VENCER ----
      if (c.end_date) {
        const endDate = new Date(c.end_date)
        const daysUntilEnd = daysBetween(endDate, today)
        if (daysUntilEnd >= 0 && daysUntilEnd <= DAYS_BEFORE_EXPIRATION) {
          const body = `El contrato de ${holder.name} (#${shortId(c.id)}) vence en ${daysUntilEnd} día${daysUntilEnd !== 1 ? 's' : ''}.`
          const key: NotifKey = { type: 'contract_expiring', contract_id: c.id, body_hash: body }
          if (!isDuplicate(key)) {
            toCreate.push({
              type: 'contract_expiring',
              title: 'Contrato próximo a vencer',
              body,
              contract_id: c.id,
              investor_id: holder.id,
            })
            existingKeys.add(`${key.type}::${key.contract_id}::${key.body_hash}`)
          }
        }
      }

      // ---- 3. REPORTE VENCIDO ----
      const lastPeriodEnd = lastReportByContract.get(c.id)
      const baseDate = lastPeriodEnd ? new Date(lastPeriodEnd) : new Date(c.start_date)
      const nextDue = addMonths(baseDate, c.report_frequency_months)
      if (nextDue < today) {
        const daysOverdue = daysBetween(today, nextDue)
        const body = `El contrato de ${holder.name} (#${shortId(c.id)}) requiere un nuevo reporte (${daysOverdue} día${daysOverdue !== 1 ? 's' : ''} atrasado${daysOverdue !== 1 ? 's' : ''}).`
        const key: NotifKey = { type: 'report_due', contract_id: c.id, body_hash: body }
        if (!isDuplicate(key)) {
          toCreate.push({
            type: 'report_due',
            title: 'Reporte pendiente',
            body,
            contract_id: c.id,
            investor_id: holder.id,
          })
          existingKeys.add(`${key.type}::${key.contract_id}::${key.body_hash}`)
        }
      }

      // ---- 2 & 5. DESEMBOLSOS PRÓXIMOS Y ATRASADOS ----
      const { schedule } = calculateInvestment({
        planType: plan.type as PlanType,
        annualRate: plan.annual_rate,
        amount: c.amount,
        termMonths: c.term_months,
        startDate: new Date(c.start_date),
      })

      const contractPayments = (payments ?? []).filter(
        (p) => p.contract_id === c.id && p.type === 'withdrawal'
      )

      for (const item of schedule) {
        // Match against payments (±7 días, ±5% monto)
        const matched = contractPayments.find((p) => {
          const paymentDate = new Date(p.payment_date)
          const dateMatch = Math.abs(paymentDate.getTime() - item.date.getTime()) <= 7 * 24 * 60 * 60 * 1000
          const amountMatch = Math.abs(p.amount - item.amount) / item.amount <= 0.05
          return dateMatch && amountMatch
        })
        if (matched) continue

        const daysFromToday = daysBetween(item.date, today)
        const formattedAmount = `$${item.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
        const formattedDate = item.date.toLocaleDateString('es-CR', { month: 'short', day: 'numeric', year: 'numeric' })

        if (daysFromToday < 0 && daysFromToday >= -1) {
          // Disbursement due today or tomorrow — actually upcoming
          // (daysBetween returns negative if item.date is future)
        }

        // PRÓXIMO DESEMBOLSO: en los próximos 7 días
        if (item.date >= today && daysBetween(item.date, today) <= DAYS_BEFORE_DISBURSEMENT) {
          const days = daysBetween(item.date, today)
          const body = `Próximo desembolso a ${holder.name} (#${shortId(c.id)}): ${formattedAmount} el ${formattedDate} (en ${days} día${days !== 1 ? 's' : ''}).`
          const key: NotifKey = { type: 'disbursement_due', contract_id: c.id, body_hash: body }
          if (!isDuplicate(key)) {
            toCreate.push({
              type: 'disbursement_due',
              title: 'Próximo desembolso',
              body,
              contract_id: c.id,
              investor_id: holder.id,
            })
            existingKeys.add(`${key.type}::${key.contract_id}::${key.body_hash}`)
          }
        }

        // DESEMBOLSO ATRASADO: la fecha ya pasó y no hay pago
        if (item.date < today) {
          const daysOverdue = daysBetween(today, item.date)
          const body = `Desembolso atrasado a ${holder.name} (#${shortId(c.id)}): ${formattedAmount} esperado el ${formattedDate} (${daysOverdue} día${daysOverdue !== 1 ? 's' : ''} atrasado${daysOverdue !== 1 ? 's' : ''}).`
          const key: NotifKey = { type: 'disbursement_due', contract_id: c.id, body_hash: body }
          if (!isDuplicate(key)) {
            toCreate.push({
              type: 'disbursement_due',
              title: 'Desembolso atrasado',
              body,
              contract_id: c.id,
              investor_id: holder.id,
            })
            existingKeys.add(`${key.type}::${key.contract_id}::${key.body_hash}`)
          }
        }
      }
    }

    // Insert all notifications (one per admin per event)
    if (toCreate.length === 0) {
      return NextResponse.json({ created: 0 })
    }

    const rows = toCreate.flatMap((n) =>
      admins.map((a) => ({
        recipient_user_id: a.id,
        type: n.type,
        channel: 'internal' as const,
        title: n.title,
        body: n.body,
        contract_id: n.contract_id,
        investor_id: n.investor_id ?? null,
      }))
    )

    const { error: insertError } = await supabase.from('notifications').insert(rows)
    if (insertError) {
      console.error('[notif/scan] insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      created: toCreate.length,
      total_inserted: rows.length,
    })
  } catch (err) {
    console.error('[notif/scan] error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
