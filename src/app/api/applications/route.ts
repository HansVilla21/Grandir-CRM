import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendNewApplicationEmail } from '@/lib/email/new-application-email'

interface ApplicationBody {
  full_name: string
  cedula: string
  phone: string
  email: string
  plan_id: string
  amount: number
  term_months: number
  beneficiaries?: Array<{
    full_name: string
    cedula: string
    phone: string
  }>
}

// Simple in-memory rate limit: 5 solicitudes/hora por IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60 * 60 * 1000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT) return false

  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'RATE_LIMIT', message: 'Demasiadas solicitudes. Intenta más tarde.' },
        { status: 429 }
      )
    }

    const body = (await request.json()) as ApplicationBody

    if (
      !body.full_name?.trim() ||
      !body.cedula?.trim() ||
      !body.email?.trim() ||
      !body.plan_id ||
      !body.amount ||
      !body.term_months
    ) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: 'Faltan campos obligatorios.' },
        { status: 400 }
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json(
        { error: 'INVALID_EMAIL', message: 'Email inválido.' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Validar plan
    const { data: plan, error: planError } = await supabase
      .from('investment_plans')
      .select('id, name, active, min_amount')
      .eq('id', body.plan_id)
      .single()

    if (planError || !plan || !plan.active) {
      return NextResponse.json(
        { error: 'INVALID_PLAN', message: 'Plan no disponible.' },
        { status: 400 }
      )
    }

    if (body.amount < plan.min_amount) {
      return NextResponse.json(
        { error: 'AMOUNT_TOO_LOW', message: `El monto mínimo para este plan es ${plan.min_amount}.` },
        { status: 400 }
      )
    }

    // Buscar o crear investor
    const cedulaWithFormat = body.cedula.trim()

    let investorId: string
    const { data: existingInvestor } = await supabase
      .from('investors')
      .select('id')
      .eq('cedula', cedulaWithFormat)
      .maybeSingle()

    if (existingInvestor) {
      investorId = existingInvestor.id
    } else {
      const { data: newInvestor, error: investorError } = await supabase
        .from('investors')
        .insert({
          full_name: body.full_name.trim(),
          cedula: cedulaWithFormat,
          phone: body.phone?.trim() || null,
          status: 'active',
        })
        .select('id')
        .single()

      if (investorError || !newInvestor) {
        return NextResponse.json(
          { error: 'INVESTOR_CREATE_FAILED', message: 'Error al crear inversionista.' },
          { status: 500 }
        )
      }
      investorId = newInvestor.id

      await supabase.from('investor_emails').insert({
        investor_id: investorId,
        email: body.email.trim().toLowerCase(),
        is_primary: true,
        verified: false,
      })
    }

    // Crear contract con source = external_form
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .insert({
        plan_id: body.plan_id,
        amount: body.amount,
        term_months: body.term_months,
        status: 'draft',
        source: 'external_form',
        report_frequency_months: 2,
        version: 1,
      })
      .select('id')
      .single()

    if (contractError || !contract) {
      return NextResponse.json(
        { error: 'CONTRACT_CREATE_FAILED', message: 'Error al crear contrato.' },
        { status: 500 }
      )
    }

    // Crear contract_investor (holder)
    await supabase.from('contract_investors').insert({
      contract_id: contract.id,
      investor_id: investorId,
      role: 'holder',
      approval_status: 'pending',
    })

    // Crear beneficiarios si hay
    if (body.beneficiaries && body.beneficiaries.length > 0) {
      for (const b of body.beneficiaries) {
        if (!b.full_name?.trim() || !b.cedula?.trim()) continue

        const cedula = b.cedula.trim()
        let beneficiaryId: string

        const { data: existingBen } = await supabase
          .from('beneficiaries')
          .select('id')
          .eq('cedula', cedula)
          .maybeSingle()

        if (existingBen) {
          beneficiaryId = existingBen.id
        } else {
          const { data: newBen } = await supabase
            .from('beneficiaries')
            .insert({
              full_name: b.full_name.trim(),
              cedula,
              phone: b.phone?.trim() || null,
            })
            .select('id')
            .single()

          if (!newBen) continue
          beneficiaryId = newBen.id
        }

        await supabase.from('contract_beneficiaries').insert({
          contract_id: contract.id,
          beneficiary_id: beneficiaryId,
        })
      }
    }

    // Crear notificaciones para admins
    const { data: admins } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('role', 'admin')

    if (admins && admins.length > 0) {
      await supabase.from('notifications').insert(
        admins.map((admin) => ({
          recipient_user_id: admin.id,
          type: 'new_application' as const,
          channel: 'both' as const,
          title: 'Nueva solicitud externa',
          body: `${body.full_name} solicitó un contrato del plan ${plan.name}`,
          contract_id: contract.id,
          investor_id: investorId,
        }))
      )

      // Enviar emails a admins
      const adminEmails: string[] = []
      for (const admin of admins) {
        const { data: authUser } = await supabase.auth.admin.getUserById(admin.id)
        if (authUser?.user?.email) adminEmails.push(authUser.user.email)
      }

      if (adminEmails.length > 0) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        await sendNewApplicationEmail({
          to: adminEmails,
          investorName: body.full_name,
          planName: plan.name,
          amount: body.amount,
          contractId: contract.id,
          dashboardUrl: `${appUrl}/dashboard/contracts/${contract.id}`,
        })
      }
    }

    return NextResponse.json({ success: true, application_id: contract.id })
  } catch (err) {
    console.error('[applications] Error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
