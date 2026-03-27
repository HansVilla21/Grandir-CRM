import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendBulletinEmail } from '@/lib/email/bulletin-email'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createAdminClient()

  // Fetch bulletin
  const { data: bulletin, error: bulletinError } = await supabase
    .from('bulletins')
    .select('id, subject, body, status, target_group, target_plan_id')
    .eq('id', id)
    .single()

  if (bulletinError) {
    const status = bulletinError.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ error: bulletinError.message }, { status })
  }

  if (bulletin.status !== 'draft') {
    return NextResponse.json(
      { error: 'Este boletín ya fue enviado' },
      { status: 409 }
    )
  }

  // Resolve recipient list
  type RecipientEntry = { investor_id: string; email: string; name: string }
  let recipients: RecipientEntry[] = []

  if (bulletin.target_group === 'custom') {
    // Use existing bulletin_recipients (pre-registered)
    const { data: existing } = await supabase
      .from('bulletin_recipients')
      .select('investor_id, email, investors(full_name)')
      .eq('bulletin_id', id)

    recipients = (existing ?? []).map((r) => {
      const inv = r.investors as { full_name: string } | null
      return {
        investor_id: r.investor_id,
        email: r.email,
        name: inv?.full_name ?? r.email,
      }
    })
  } else if (bulletin.target_group === 'all_active' || bulletin.target_group === 'all_inactive') {
    const targetStatus = bulletin.target_group === 'all_active' ? 'active' : 'inactive'

    const { data: investors } = await supabase
      .from('investors')
      .select('id, full_name, investor_emails(email, is_primary)')
      .eq('status', targetStatus)

    for (const inv of investors ?? []) {
      const emails = inv.investor_emails as { email: string; is_primary: boolean }[] | null
      const primary = emails?.find((e) => e.is_primary) ?? emails?.[0]
      if (primary) {
        recipients.push({ investor_id: inv.id, email: primary.email, name: inv.full_name })
      }
    }
  } else if (bulletin.target_group === 'by_plan') {
    if (!bulletin.target_plan_id) {
      return NextResponse.json(
        { error: 'Falta el plan objetivo para target_group=by_plan' },
        { status: 400 }
      )
    }

    // Active contracts of the target plan
    const { data: contracts } = await supabase
      .from('contracts')
      .select('id')
      .eq('plan_id', bulletin.target_plan_id)
      .eq('status', 'active')

    const contractIds = (contracts ?? []).map((c) => c.id)

    if (contractIds.length > 0) {
      const { data: contractInvestors } = await supabase
        .from('contract_investors')
        .select('investor_id, investors(id, full_name, investor_emails(email, is_primary))')
        .in('contract_id', contractIds)

      const seen = new Set<string>()
      for (const ci of contractInvestors ?? []) {
        if (seen.has(ci.investor_id)) continue
        seen.add(ci.investor_id)

        const inv = ci.investors as {
          id: string
          full_name: string
          investor_emails: { email: string; is_primary: boolean }[]
        } | null

        if (!inv) continue
        const primary = inv.investor_emails?.find((e) => e.is_primary) ?? inv.investor_emails?.[0]
        if (primary) {
          recipients.push({ investor_id: inv.id, email: primary.email, name: inv.full_name })
        }
      }
    }
  }

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: 'No hay destinatarios para este boletín' },
      { status: 400 }
    )
  }

  // Insert bulletin_recipients (skip existing for custom group)
  if (bulletin.target_group !== 'custom') {
    const recipientRows = recipients.map((r) => ({
      bulletin_id: id,
      investor_id: r.investor_id,
      email: r.email,
      delivered: false,
      opened: false,
    }))

    const { error: insertError } = await supabase
      .from('bulletin_recipients')
      .insert(recipientRows)

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  // Send emails
  const emailResults = await Promise.allSettled(
    recipients.map((r) =>
      sendBulletinEmail({
        to: r.email,
        investorName: r.name,
        subject: bulletin.subject,
        body: bulletin.body,
      })
    )
  )

  const sentCount = emailResults.filter((r) => r.status === 'fulfilled').length

  // Mark bulletin as sent
  const { error: updateError } = await supabase
    .from('bulletins')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sent: sentCount, total: recipients.length })
}
