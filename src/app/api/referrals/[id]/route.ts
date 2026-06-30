import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/guard'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Pagar comisión es acción sensible → solo admin.
    const { profile, response } = await requireAdmin()
    if (response) return response

    const { id } = await params
    const adminSupabase = createServiceClient()

    // Detect content-type: multipart for upload, JSON for legacy/no-receipt path
    const contentType = request.headers.get('content-type') ?? ''
    let action: string | undefined
    let receiptPath: string | null = null
    let receiptFile: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      action = (formData.get('action') as string | null) ?? undefined
      const file = formData.get('receipt')
      if (file instanceof File && file.size > 0) {
        receiptFile = file
      }
    } else {
      const body = await request.json()
      action = body.action as string | undefined
      receiptPath = (body.receipt_path as string | undefined) ?? null
    }

    // Fetch commission to verify it exists
    const { data: existing, error: fetchError } = await adminSupabase
      .from('referral_commissions')
      .select('id, paid')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Comisión no encontrada' }, { status: 404 })
    }

    if (action === 'pay') {
      if (existing.paid) {
        return NextResponse.json(
          { error: 'Esta comisión ya fue marcada como pagada' },
          { status: 400 }
        )
      }

      // Upload receipt if provided
      if (receiptFile) {
        const serviceSupabase = createServiceClient()
        const timestamp = Date.now()
        const safeName = receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `commissions/${id}/${timestamp}_${safeName}`

        const arrayBuffer = await receiptFile.arrayBuffer()
        const buffer = new Uint8Array(arrayBuffer)

        const { error: uploadError } = await serviceSupabase.storage
          .from('contracts')
          .upload(storagePath, buffer, {
            contentType: receiptFile.type || 'application/octet-stream',
            upsert: false,
          })

        if (uploadError) {
          return NextResponse.json(
            { error: `Error al subir comprobante: ${uploadError.message}` },
            { status: 500 }
          )
        }

        receiptPath = storagePath
      }

      const { data: commission, error: updateError } = await adminSupabase
        .from('referral_commissions')
        .update({
          paid: true,
          paid_at: new Date().toISOString(),
          receipt_path: receiptPath,
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // Notify OTHER admins
      try {
        const { notifyAdmins } = await import('@/lib/notifications/notify-admins')
        const { data: referrer } = await adminSupabase
          .from('investors')
          .select('full_name')
          .eq('id', commission.referrer_id)
          .single()
        const formattedAmount = `$${commission.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
        await notifyAdmins({
          supabase: adminSupabase,
          type: 'approval',
          channel: 'internal',
          title: 'Comisión de referido pagada',
          body: `Se pagó una comisión de ${formattedAmount} a ${referrer?.full_name ?? 'un inversionista'}.`,
          investor_id: commission.referrer_id,
          exclude_user_id: profile.id,
        })
      } catch (notifErr) {
        console.error('[referrals/pay] notify error:', notifErr)
      }

      return NextResponse.json({ commission })
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
