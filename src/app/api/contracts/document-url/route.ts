import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

/**
 * Genera una signed URL temporal (1 h) para un documento del bucket `contracts`.
 * Solo accesible para usuarios autenticados del dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient()
    const {
      data: { user },
    } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path) {
      return NextResponse.json({ error: 'path es requerido' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase.storage
      .from('contracts')
      .createSignedUrl(path, 3600)

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: error?.message ?? 'No se pudo generar la URL del documento' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
