import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServiceClient } from '@/lib/supabase/server'
import type { ContractStatus } from '@/types/contracts'

// Valid state transitions
const ALLOWED_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  draft: ['pending_approval'],
  pending_approval: ['active', 'revision_requested'],
  revision_requested: ['draft', 'cancelled'],
  active: ['expired', 'cancelled'],
  expired: [],
  cancelled: [],
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createAdminClient()

    // Contract + plan
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        *,
        plan:investment_plans(id, name, type, annual_rate, min_amount)
      `)
      .eq('id', id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }

    // contract_investors with investor data
    const { data: contractInvestors, error: ciError } = await supabase
      .from('contract_investors')
      .select(`
        *,
        investor:investors(
          full_name, cedula,
          emails:investor_emails(email, is_primary)
        )
      `)
      .eq('contract_id', id)

    if (ciError) {
      return NextResponse.json({ error: ciError.message }, { status: 500 })
    }

    // Payments ordered by date desc
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('contract_id', id)
      .order('payment_date', { ascending: false })

    if (paymentsError) {
      return NextResponse.json({ error: paymentsError.message }, { status: 500 })
    }

    // Documents ordered by created_at desc
    const { data: documents, error: docsError } = await supabase
      .from('contract_documents')
      .select('*')
      .eq('contract_id', id)
      .order('created_at', { ascending: false })

    if (docsError) {
      return NextResponse.json({ error: docsError.message }, { status: 500 })
    }

    // Reports
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('*')
      .eq('contract_id', id)
      .order('period_start', { ascending: false })

    if (reportsError) {
      return NextResponse.json({ error: reportsError.message }, { status: 500 })
    }

    const result = {
      ...contract,
      contract_investors: contractInvestors ?? [],
      payments: payments ?? [],
      contract_documents: documents ?? [],
      reports: reports ?? [],
    }

    return NextResponse.json({ contract: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createAdminClient()
    const body = await request.json()

    // Fetch current contract
    const { data: current, error: fetchError } = await supabase
      .from('contracts')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }

    // Case 1: status transition
    if ('status' in body) {
      const newStatus = body.status as ContractStatus
      const allowed = ALLOWED_TRANSITIONS[current.status as ContractStatus] ?? []

      if (!allowed.includes(newStatus)) {
        return NextResponse.json(
          {
            error: `Transición no permitida: ${current.status} → ${newStatus}`,
          },
          { status: 422 }
        )
      }

      const updatePayload: Record<string, unknown> = { status: newStatus }

      // If transitioning to active, set start_date if missing
      if (newStatus === 'active') {
        const { data: full } = await supabase
          .from('contracts')
          .select('start_date, term_months')
          .eq('id', id)
          .single()

        if (full && !full.start_date) {
          const startDate = new Date()
          const endDate = new Date(startDate)
          endDate.setMonth(endDate.getMonth() + full.term_months)
          updatePayload.start_date = startDate.toISOString().split('T')[0]
          updatePayload.end_date = endDate.toISOString().split('T')[0]
        } else if (full && full.start_date) {
          const startDate = new Date(full.start_date)
          const endDate = new Date(startDate)
          endDate.setMonth(endDate.getMonth() + full.term_months)
          updatePayload.end_date = endDate.toISOString().split('T')[0]
        }
      }

      const { data: updated, error: updateError } = await supabase
        .from('contracts')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // --- pending_approval: generate tokens, PDF & send invitation ---
      if (newStatus === 'pending_approval') {
        const { sendContractInvitationEmail } = await import('@/lib/email/contract-invitation-email')
        const { generateContractPdf } = await import('@/lib/pdf/generate-contract-pdf')

        // 1. Get contract investors
        const { data: contractInvestors } = await supabase
          .from('contract_investors')
          .select('id, investor_id, portal_token')
          .eq('contract_id', id)

        // 2. Get contract + plan for PDF and email
        const { data: contractWithPlan } = await supabase
          .from('contracts')
          .select('amount, term_months, start_date, end_date, investment_plans(name, type, annual_rate)')
          .eq('id', id)
          .single()

        const plan = contractWithPlan?.investment_plans as { name: string; type: string; annual_rate: number } | null
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

        for (const ci of contractInvestors ?? []) {
          // Generate token if missing
          let portalToken = ci.portal_token
          if (!portalToken) {
            portalToken = crypto.randomUUID()
            const expiresAt = new Date()
            expiresAt.setFullYear(expiresAt.getFullYear() + 1)
            await supabase
              .from('contract_investors')
              .update({ portal_token: portalToken, token_expires_at: expiresAt.toISOString() })
              .eq('id', ci.id)
          }

          // Get investor data
          const { data: investor } = await supabase
            .from('investors')
            .select('full_name, cedula')
            .eq('id', ci.investor_id)
            .single()

          // Get investor primary email
          const { data: emails } = await supabase
            .from('investor_emails')
            .select('email')
            .eq('investor_id', ci.investor_id)
            .eq('is_primary', true)
            .limit(1)

          const primaryEmail = emails?.[0]?.email

          if (investor && primaryEmail && contractWithPlan) {
            // Generate contract PDF
            try {
              const pdfBuffer = await generateContractPdf({
                investor_name: investor.full_name,
                investor_cedula: investor.cedula,
                amount: contractWithPlan.amount,
                term_months: contractWithPlan.term_months,
                start_date: contractWithPlan.start_date ?? '',
                end_date: contractWithPlan.end_date,
                annual_rate: plan?.annual_rate ?? 0,
                plan_name: plan?.name ?? '—',
                plan_type: plan?.type ?? 'annual',
                contract_id: id,
              })
              const storagePath = `${id}/contrato_${Date.now()}.pdf`
              const storageClient = createServiceClient()
              await storageClient.storage.from('contracts').upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: false })
              await supabase.from('contract_documents').insert({
                contract_id: id,
                type: 'draft',
                file_name: `contrato-${id.slice(0, 8)}.pdf`,
                storage_path: storagePath,
                file_size: pdfBuffer.length,
                mime_type: 'application/pdf',
              })
            } catch (pdfErr) {
              console.error('Error generating contract PDF:', pdfErr)
            }

            // Send invitation email (non-blocking — don't break if Resend fails)
            try {
              await sendContractInvitationEmail({
                to: [primaryEmail],
                investorName: investor.full_name,
                planName: plan?.name ?? '—',
                amount: contractWithPlan.amount,
                termMonths: contractWithPlan.term_months,
                portalUrl: `${appUrl}/portal/${portalToken}`,
              })
            } catch (emailErr) {
              console.error('Error sending invitation email:', emailErr)
            }
          }
        }
      }

      return NextResponse.json({ contract: updated })
    }

    // Case 2: field update (only allowed in draft or revision_requested)
    if (current.status !== 'draft' && current.status !== 'revision_requested') {
      return NextResponse.json(
        { error: 'Solo se pueden editar contratos en borrador o revisión solicitada' },
        { status: 422 }
      )
    }

    const allowedFields = ['amount', 'term_months', 'start_date', 'notes'] as const
    const updatePayload: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (field in body) {
        updatePayload[field] = body[field]
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('contracts')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ contract: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
