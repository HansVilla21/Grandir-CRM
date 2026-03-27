import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const supabase = await createAdminClient()

  // 1. Buscar contract_investor por portal_token
  const { data: contractInvestor, error: ciError } = await supabase
    .from('contract_investors')
    .select('*')
    .eq('portal_token', token)
    .single()

  if (ciError || !contractInvestor) {
    return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 404 })
  }

  // 2. Verificar expiración
  if (
    contractInvestor.token_expires_at &&
    new Date(contractInvestor.token_expires_at) < new Date()
  ) {
    return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 404 })
  }

  const contractId = contractInvestor.contract_id
  const investorId = contractInvestor.investor_id

  // 3. Obtener datos del contrato con plan
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select(`
      id,
      amount,
      status,
      term_months,
      start_date,
      end_date,
      notes,
      version,
      investment_plans (
        id,
        name,
        type,
        annual_rate,
        payment_structure
      )
    `)
    .eq('id', contractId)
    .single()

  if (contractError || !contract) {
    return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 404 })
  }

  // 4. Obtener datos del inversionista
  const { data: investor } = await supabase
    .from('investors')
    .select('id, full_name, cedula, phone')
    .eq('id', investorId)
    .single()

  // 5. Emails del inversionista
  const { data: emails } = await supabase
    .from('investor_emails')
    .select('email, is_primary')
    .eq('investor_id', investorId)
    .order('is_primary', { ascending: false })

  // 6. Pagos verificados del contrato
  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, payment_date, type, notes')
    .eq('contract_id', contractId)
    .eq('verified', true)
    .order('payment_date', { ascending: false })

  // 7. Documentos del contrato con signed URLs
  const { data: documents } = await supabase
    .from('contract_documents')
    .select('id, type, file_name, storage_path, created_at, mime_type')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false })

  const documentsWithUrls = await Promise.all(
    (documents ?? []).map(async (doc) => {
      const { data: signedData } = await supabase.storage
        .from('contracts')
        .createSignedUrl(doc.storage_path, 3600) // 1 hora de validez
      return {
        ...doc,
        signed_url: signedData?.signedUrl ?? null,
      }
    })
  )

  // 8. Reportes enviados del contrato
  const { data: reports } = await supabase
    .from('reports')
    .select('id, period_start, period_end, growth_rate, calculated_amount, pdf_path, sent_at, status')
    .eq('contract_id', contractId)
    .eq('status', 'sent')
    .order('period_start', { ascending: false })

  const reportsWithUrls = await Promise.all(
    (reports ?? []).map(async (report) => {
      if (!report.pdf_path) return { ...report, signed_url: null }
      const { data: signedData } = await supabase.storage
        .from('contracts')
        .createSignedUrl(report.pdf_path, 3600)
      return {
        ...report,
        signed_url: signedData?.signedUrl ?? null,
      }
    })
  )

  return NextResponse.json({
    contractInvestor: {
      id: contractInvestor.id,
      role: contractInvestor.role,
      approval_status: contractInvestor.approval_status,
      revision_comment: contractInvestor.revision_comment,
      approved_at: contractInvestor.approved_at,
    },
    investor: investor
      ? {
          id: investor.id,
          full_name: investor.full_name,
          cedula: investor.cedula,
          phone: investor.phone,
          emails: emails ?? [],
        }
      : null,
    contract: {
      id: contract.id,
      amount: contract.amount,
      status: contract.status,
      term_months: contract.term_months,
      start_date: contract.start_date,
      end_date: contract.end_date,
      version: contract.version,
    },
    plan: contract.investment_plans,
    payments: payments ?? [],
    documents: documentsWithUrls,
    reports: reportsWithUrls,
  })
}
