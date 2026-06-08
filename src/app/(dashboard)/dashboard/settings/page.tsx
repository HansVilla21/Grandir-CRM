import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UsersSection } from './_components/users-section'
import { PlansSection } from './_components/plans-section'
import { ContractTemplatesSection } from './_components/contract-templates-section'

export const metadata = {
  title: 'Configuración | Grandir CM',
}

export default async function SettingsPage() {
  const supabase = await createAdminClient()

  // Verify session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get current user's profile
  const { data: currentProfile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const currentUserRole = currentProfile?.role ?? 'assistant'

  // Fetch all user profiles
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: true })

  // Fetch auth users to get emails
  const { data: authData } = await supabase.auth.admin.listUsers()

  const authUserMap = new Map(
    (authData?.users ?? []).map((u) => [u.id, u.email ?? ''])
  )

  const systemUsers = (profiles ?? []).map((p) => ({
    id: p.id,
    email: authUserMap.get(p.id) ?? '',
    full_name: p.full_name,
    role: p.role as 'admin' | 'assistant',
    active: p.active,
    created_at: p.created_at,
  }))

  // Fetch all investment plans
  const { data: plans } = await supabase
    .from('investment_plans')
    .select('*')
    .order('created_at', { ascending: true })

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Configuración</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Gestión de usuarios del sistema y planes de inversión
        </p>
      </div>

      {/* Usuarios del sistema */}
      <UsersSection
        users={systemUsers}
        currentUserRole={currentUserRole as 'admin' | 'assistant'}
      />

      {/* Divider */}
      <hr className="border-zinc-100" />

      {/* Planes de inversión */}
      <PlansSection plans={plans ?? []} />

      {/* Divider */}
      <hr className="border-zinc-100" />

      {/* Plantillas de contratos */}
      <ContractTemplatesSection
        plans={(plans ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type as 'annual' | 'monthly' | 'semestral',
        }))}
      />
    </div>
  )
}
