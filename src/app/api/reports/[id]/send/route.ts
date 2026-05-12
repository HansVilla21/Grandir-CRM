import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendReportEmail } from '@/lib/email/report-email'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createAdminClient()

    // Fetch report
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select(`
        *,
        contracts (
          amount,
          investment_plans (name)
        )
      `)
      .eq('id', id)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    if (!['pending', 'generated'].includes(report.status)) {
      return NextResponse.json(
        { error: `No se puede enviar un reporte con estado "${report.status}"` },
        { status: 400 }
      )
    }

    // Get all investor emails for the contract
    const { data: contractInvestors } = await supabase
      .from('contract_investors')
      .select(`
        investors (
          full_name,
          investor_emails (email, is_primary)
        )
      `)
      .eq('contract_id', report.contract_id)

    const recipientEmails: string[] = []
    let holderName = 'Inversionista'

    const holders = (contractInvestors ?? []).filter((_ci, idx) => idx === 0)

    for (const ci of contractInvestors ?? []) {
      const inv = ci.investors as {
        full_name: string
        investor_emails: { email: string; is_primary: boolean }[]
      } | null
      if (!inv) continue
      for (const emailRow of inv.investor_emails ?? []) {
        if (!recipientEmails.includes(emailRow.email)) {
          recipientEmails.push(emailRow.email)
        }
      }
    }

    // Get holder name from first holder role
    const { data: holderRow } = await supabase
      .from('contract_investors')
      .select('investors(full_name)')
      .eq('contract_id', report.contract_id)
      .eq('role', 'holder')
      .single()

    const holderInv = holderRow?.investors as { full_name: string } | null
    if (holderInv?.full_name) holderName = holderInv.full_name

    if (recipientEmails.length === 0) {
      return NextResponse.json(
        { error: 'No hay emails de inversionistas para enviar' },
        { status: 400 }
      )
    }

    // Generate signed URL for PDF if exists
    let pdfUrl: string | null = null
    if (report.pdf_path) {
      const { data: signedData } = await supabase.storage
        .from('contracts')
        .createSignedUrl(report.pdf_path, 60 * 60 * 24 * 7) // 7 days

      pdfUrl = signedData?.signedUrl ?? null
    }

    const contract = report.contracts as {
      amount: number
      investment_plans: { name: string } | null
    } | null

    // Send email (non-blocking — don't break if Resend fails)
    try {
      await sendReportEmail({
        to: recipientEmails,
        investorName: holderName,
        contractId: report.contract_id,
        periodStart: report.period_start,
        periodEnd: report.period_end,
        growthRate: report.growth_rate,
        calculatedAmount: report.calculated_amount,
        description: report.description,
        pdfUrl,
      })
    } catch (emailErr) {
      console.error('[reports] Error sending report email:', emailErr)
    }

    // Update report status
    const { data: updated, error: updateError } = await supabase
      .from('reports')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_to: recipientEmails,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Notify admins
    try {
      const { notifyAdmins } = await import('@/lib/notifications/notify-admins')
      await notifyAdmins({
        supabase,
        type: 'approval',
        channel: 'internal',
        title: 'Reporte enviado',
        body: `Reporte enviado a ${holderName ?? 'inversionista'} (${recipientEmails.length} destinatario${recipientEmails.length !== 1 ? 's' : ''}).`,
        contract_id: report.contract_id,
      })
    } catch (notifErr) {
      console.error('[reports/send] notify error:', notifErr)
    }

    // Suppress unused variable warning
    void holders
    void contract

    return NextResponse.json({
      success: true,
      sent_to: recipientEmails,
      report: updated,
    })
  } catch (err) {
    console.error('POST /api/reports/[id]/send error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
