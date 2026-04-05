export type PlanType = 'annual' | 'monthly' | 'semestral'

export interface CalculatorInput {
  planType: PlanType
  annualRate: number // percentage, e.g., 120 means 120%
  amount: number
  termMonths: number
  startDate?: Date
}

export interface ScheduleItem {
  date: Date
  type: 'return' | 'final_payout'
  amount: number
  description: string
}

export interface CalculatorResult {
  capital: number
  totalReturn: number // profit in $
  totalPayout: number // capital + profit
  endDate: Date
  schedule: ScheduleItem[]
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

/**
 * Calcula el rendimiento y cronograma de una inversión según el plan.
 *
 * Lógica basada en requerimientos del cliente (sección 4.2):
 * - Anual (120%): pago único al final. Return = capital * 0.20
 * - Mensual (125%): 10% del capital mensual desde mes 3. Resto al final.
 * - Semestral (135%): desembolsos semestrales del 40% del capital. Resto al final.
 */
export function calculateInvestment(input: CalculatorInput): CalculatorResult {
  const { planType, annualRate, amount, termMonths } = input
  const startDate = input.startDate ?? new Date()
  const endDate = addMonths(startDate, termMonths)

  // El rendimiento total es el % sobre el capital. Ej: 120% = 0.20 de rendimiento real
  const profitPercentage = (annualRate - 100) / 100
  const totalReturn = amount * profitPercentage
  const totalPayout = amount + totalReturn

  const schedule: ScheduleItem[] = []

  if (planType === 'annual') {
    schedule.push({
      date: endDate,
      type: 'final_payout',
      amount: totalPayout,
      description: 'Pago único al vencimiento (capital + rendimiento)',
    })
  } else if (planType === 'monthly') {
    const monthlyReturn = amount * 0.1
    let paidReturn = 0

    for (let month = 3; month <= termMonths; month++) {
      schedule.push({
        date: addMonths(startDate, month),
        type: 'return',
        amount: monthlyReturn,
        description: `Pago mensual (10% del capital) — mes ${month}`,
      })
      paidReturn += monthlyReturn
    }

    const finalAmount = amount + (totalReturn - paidReturn)
    schedule.push({
      date: endDate,
      type: 'final_payout',
      amount: finalAmount,
      description: 'Capital + rendimiento restante al vencimiento',
    })
  } else if (planType === 'semestral') {
    const semestralReturn = amount * 0.4
    let paidReturn = 0

    for (let month = 6; month <= termMonths; month += 6) {
      schedule.push({
        date: addMonths(startDate, month),
        type: 'return',
        amount: semestralReturn,
        description: `Pago semestral (40% del capital) — mes ${month}`,
      })
      paidReturn += semestralReturn
    }

    const finalAmount = amount + (totalReturn - paidReturn)
    const lastItem = schedule[schedule.length - 1]
    if (lastItem && lastItem.date.getTime() === endDate.getTime()) {
      lastItem.amount += finalAmount - semestralReturn
      lastItem.type = 'final_payout'
      lastItem.description = 'Pago semestral final + capital'
    } else {
      schedule.push({
        date: endDate,
        type: 'final_payout',
        amount: finalAmount,
        description: 'Capital + rendimiento restante al vencimiento',
      })
    }
  }

  return {
    capital: amount,
    totalReturn,
    totalPayout,
    endDate,
    schedule,
  }
}
