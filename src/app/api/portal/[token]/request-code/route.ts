import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createAndSendCode } from '@/lib/signing/verification'

/** Normaliza cedula: solo digitos */
function normalizeCedula(s: string): string {
  return s.replace(/\D/g, '')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // 1. Parsear body
  let body: { cedula?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'INVALID_BODY', message: 'El cuerpo de la solicitud no es valido.' },
      { status: 400 }
    )
  }

  const { cedula } = body

  if (!cedula) {
    return NextResponse.json(
      { error: 'MISSING_FIELDS', message: 'La cedula es requerida.' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  // 2. Validar token: buscar contract_investor
  const { data: ci, error: ciError } = await supabase
    .from('contract_investors')
    .select('id, investor_id, approval_status, token_expires_at')
    .eq('portal_token', token)
    .single()

  if (ciError || !ci) {
    return NextResponse.json(
      { error: 'TOKEN_INVALID', message: 'Enlace no valido o expirado.' },
      { status: 404 }
    )
  }

  if (ci.token_expires_at && new Date(ci.token_expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'TOKEN_INVALID', message: 'Enlace no valido o expirado.' },
      { status: 404 }
    )
  }

  if (ci.approval_status !== 'pending') {
    return NextResponse.json(
      { error: 'ALREADY_PROCESSED', message: 'Este contrato ya fue firmado.' },
      { status: 400 }
    )
  }

  // 3. Obtener datos del inversionista
  const { data: investor, error: investorError } = await supabase
    .from('investors')
    .select('full_name, cedula')
    .eq('id', ci.investor_id)
    .single()

  if (investorError || !investor) {
    return NextResponse.json(
      { error: 'INVESTOR_NOT_FOUND', message: 'No se encontro el inversionista.' },
      { status: 404 }
    )
  }

  // 4. Validar identidad por cedula
  if (normalizeCedula(cedula) !== normalizeCedula(investor.cedula)) {
    return NextResponse.json(
      { error: 'IDENTITY_MISMATCH', message: 'La cedula no coincide con la registrada.' },
      { status: 422 }
    )
  }

  // 5. Obtener email principal
  const { data: primaryEmailRecord, error: emailError } = await supabase
    .from('investor_emails')
    .select('email')
    .eq('investor_id', ci.investor_id)
    .eq('is_primary', true)
    .single()

  if (emailError || !primaryEmailRecord) {
    return NextResponse.json(
      { error: 'NO_EMAIL', message: 'No se encontro un correo electronico registrado.' },
      { status: 422 }
    )
  }

  // 6. Crear y enviar codigo de verificacion
  const result = await createAndSendCode(ci.id, primaryEmailRecord.email, investor.full_name)

  if (!result.success) {
    if (result.error === 'RATE_LIMIT') {
      return NextResponse.json(
        { error: 'RATE_LIMIT', message: 'Se ha excedido el limite de codigos por hora. Intente mas tarde.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'SEND_FAILED', message: result.error ?? 'Error al enviar el codigo de verificacion.' },
      { status: 500 }
    )
  }

  // 7. Respuesta exitosa
  return NextResponse.json({
    success: true,
    masked_email: result.masked_email,
  })
}
