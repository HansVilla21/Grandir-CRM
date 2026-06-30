import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logout } from '@/lib/auth/actions'
import { MobileSidebarProvider } from '@/components/layout/mobile-sidebar-context'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Perfil leído con service-role para no depender de RLS al autorizar.
  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('full_name, role, active')
    .eq('id', user.id)
    .single()

  // Cuenta fantasma (sin perfil) o desactivada: cerrar sesión y mandar a login.
  // signOut limpia la cookie => el proxy permite /login en el siguiente request (sin loop).
  if (!profile || !profile.active) {
    await supabase.auth.signOut()
    redirect('/login?error=cuenta-no-habilitada')
  }

  const userName = profile.full_name ?? user.email ?? 'Usuario'
  const userRole = profile.role ?? 'assistant'

  return (
    <MobileSidebarProvider>
      {/*
        Layout fixed inset-0 saca el dashboard del flow del <body>, evitando que
        el body crezca más allá del viewport y aparezca scroll de página con
        espacio en blanco al final. El único scroller real es el <main>.
      */}
      <div className="fixed inset-0 flex bg-zinc-50 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header userName={userName} userRole={userRole} logoutAction={logout} />
          <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </MobileSidebarProvider>
  )
}
