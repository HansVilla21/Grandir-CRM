import type { Metadata } from 'next'
import type { PortalData } from '@/types/portal'
import { PortalContractView } from './_components/portal-contract-view'

interface PageProps {
  params: Promise<{ token: string }>
}

export const metadata: Metadata = {
  title: 'Portal del Inversionista — Grandir CM',
}

async function fetchPortalData(token: string): Promise<PortalData | null> {
  // Construir URL absoluta (requerida en Server Components)
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  try {
    const res = await fetch(`${baseUrl}/api/portal/${token}`, {
      cache: 'no-store',
    })

    if (!res.ok) return null

    const data = await res.json()
    return data as PortalData
  } catch {
    return null
  }
}

export default async function PortalPage({ params }: PageProps) {
  const { token } = await params

  const data = await fetchPortalData(token)

  if (!data) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="rounded-xl bg-white border border-zinc-200 p-10 space-y-4">
          <div className="text-5xl">&#128683;</div>
          <h1 className="text-xl font-semibold text-zinc-900">
            Enlace no valido o expirado
          </h1>
          <p className="text-base text-zinc-500">
            Este enlace no es valido o ha expirado. Contacta a Grandir CM para obtener
            un nuevo enlace de acceso.
          </p>
          <div className="pt-4 border-t border-zinc-100">
            <p className="text-sm text-zinc-400">
              Si crees que esto es un error, por favor comunicate con nosotros directamente.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <PortalContractView data={data} token={token} />
}
