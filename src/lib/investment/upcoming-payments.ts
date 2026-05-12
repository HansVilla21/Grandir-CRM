import { calculateInvestment, type PlanType, type ScheduleItem } from './calculator'

export interface ContractForSchedule {
  id: string
  amount: number
  term_months: number
  start_date: string | null
  end_date: string | null
  plan_type: PlanType
  annual_rate: number
  plan_name: string
  holder_name: string | null
  holder_email: string | null
}

export interface RegisteredPayment {
  contract_id: string
  amount: number
  payment_date: string
  type: 'deposit' | 'withdrawal' | 'commission'
}

export interface UpcomingPayment {
  contract_id: string
  holder_name: string | null
  holder_email: string | null
  plan_name: string
  scheduled_date: string // ISO date
  expected_amount: number
  description: string
  type: ScheduleItem['type']
  status: 'overdue' | 'this_month' | 'upcoming' | 'paid'
  paid_amount?: number
  paid_date?: string
}

const TOLERANCE_DAYS = 7 // Match a registered withdrawal to a scheduled payout within ±7 days
const AMOUNT_TOLERANCE_PCT = 0.05 // 5% amount variance allowed

function isWithinDays(a: Date, b: Date, days: number): boolean {
  const diff = Math.abs(a.getTime() - b.getTime())
  return diff <= days * 24 * 60 * 60 * 1000
}

function isThisMonth(date: Date, now: Date): boolean {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  )
}

function isOverdue(date: Date, now: Date): boolean {
  // Strictly before today (start of day)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return date < today
}

/**
 * Computes the upcoming/missed/paid payment status for each scheduled payout of each contract.
 *
 * Logic:
 * - For each active contract, project schedule using calculator
 * - Match each scheduled withdrawal/payout against actual `withdrawal` payments
 *   (within ±TOLERANCE_DAYS and AMOUNT_TOLERANCE_PCT)
 * - Classify each schedule item: paid / overdue / this_month / upcoming
 */
export function computeUpcomingPayments(
  contracts: ContractForSchedule[],
  payments: RegisteredPayment[],
  now: Date = new Date()
): UpcomingPayment[] {
  const result: UpcomingPayment[] = []

  for (const contract of contracts) {
    if (!contract.start_date) continue

    const { schedule } = calculateInvestment({
      planType: contract.plan_type,
      annualRate: contract.annual_rate,
      amount: contract.amount,
      termMonths: contract.term_months,
      startDate: new Date(contract.start_date),
    })

    const contractPayments = payments.filter(
      (p) => p.contract_id === contract.id && p.type === 'withdrawal'
    )

    for (const item of schedule) {
      // Try to match this scheduled payout with a registered withdrawal
      const matched = contractPayments.find((p) => {
        const paymentDate = new Date(p.payment_date)
        const dateMatch = isWithinDays(paymentDate, item.date, TOLERANCE_DAYS)
        const amountMatch =
          Math.abs(p.amount - item.amount) / item.amount <= AMOUNT_TOLERANCE_PCT
        return dateMatch && amountMatch
      })

      let status: UpcomingPayment['status']
      if (matched) status = 'paid'
      else if (isOverdue(item.date, now)) status = 'overdue'
      else if (isThisMonth(item.date, now)) status = 'this_month'
      else status = 'upcoming'

      result.push({
        contract_id: contract.id,
        holder_name: contract.holder_name,
        holder_email: contract.holder_email,
        plan_name: contract.plan_name,
        scheduled_date: item.date.toISOString().slice(0, 10),
        expected_amount: item.amount,
        description: item.description,
        type: item.type,
        status,
        paid_amount: matched?.amount,
        paid_date: matched?.payment_date,
      })
    }
  }

  // Sort: overdue first, then this_month, then upcoming, then paid; within each group by date asc
  const order: Record<UpcomingPayment['status'], number> = {
    overdue: 0,
    this_month: 1,
    upcoming: 2,
    paid: 3,
  }
  return result.sort((a, b) => {
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
    return a.scheduled_date.localeCompare(b.scheduled_date)
  })
}

/**
 * Counts payments by status for dashboard summary.
 */
export function summarizeUpcomingPayments(items: UpcomingPayment[]): {
  overdue: number
  thisMonth: number
  upcoming: number
  paid: number
  pendingAmount: number
  thisMonthAmount: number
} {
  let overdue = 0
  let thisMonth = 0
  let upcoming = 0
  let paid = 0
  let pendingAmount = 0
  let thisMonthAmount = 0

  for (const item of items) {
    if (item.status === 'overdue') {
      overdue++
      pendingAmount += item.expected_amount
    } else if (item.status === 'this_month') {
      thisMonth++
      pendingAmount += item.expected_amount
      thisMonthAmount += item.expected_amount
    } else if (item.status === 'upcoming') {
      upcoming++
    } else {
      paid++
    }
  }

  return { overdue, thisMonth, upcoming, paid, pendingAmount, thisMonthAmount }
}
