import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Portal del Inversionista — Grandir CM',
  description: 'Accede a tu contrato de inversión con Grandir CM',
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Barra superior */}
      <header className="bg-white border-b border-zinc-200 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <span className="text-lg sm:text-xl font-semibold text-zinc-900 tracking-tight">
            Grandir CM
          </span>
          <span className="text-xs sm:text-sm text-zinc-500">
            Portal del Inversionista
          </span>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto text-center text-sm text-zinc-400">
          Grandir CM &copy; 2026 &mdash; Todos los derechos reservados
        </div>
      </footer>
    </div>
  )
}
