import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const supabase = await createAdminClient()

  // 1. Buscar contract_investor por token
  const { data: contractInvestor, error: ciError } = await supabase
    .from('contract_investors')
    .select('id, contract_id, approval_status, token_expires_at')
    .eq('portal_token', token)
    .single()

  if (ciError || !contractInvestor) {
    return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 404 })
  }

  // Verificar expiración
  if (
    contractInvestor.token_expires_at &&
    new Date(contractInvestor.token_expires_at) < new Date()
  ) {
    return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 404 })
  }

  // 2. Validar que está pendiente
  if (contractInvestor.approval_status !== 'pending') {
    return NextResponse.json(
      { error: 'ALREADY_PROCESSED', message: 'Este contrato ya fue procesado.' },
      { status: 400 }
    )
  }

  const contractId = contractInvestor.contract_id

  // 3. Marcar como aprobado
  const { error: updateError } = await supabase
    .from('contract_investors')
    .update({
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', contractInvestor.id)

  if (updateError) {
    return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 })
  }

  // 4. Verificar si todos los co-inversionistas aprobaron
  const { data: allInvestors } = await supabase
    .from('contract_investors')
    .select('approval_status')
    .eq('contract_id', contractId)

  const allApproved = allInvestors?.every(
    (ci) => ci.approval_status === 'approved'
  )

  if (allApproved) {
    // 5. Obtener el contrato para calcular end_date
    const { data: contract } = await supabase
      .from('contracts')
      .select('start_date, term_months')
      .eq('id', contractId)
      .single()

    const endDate =
      contract?.start_date && contract?.term_months
        ? addMonths(new Date(contract.start_date), contract.term_months).toISOString().split('T')[0]
        : null

    await supabase
      .from('contracts')
      .update({
        status: 'active',
        ...(endDate ? { end_date: endDate } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', contractId)
  }

  return NextResponse.json({ success: true, all_approved: allApproved ?? false })
}
