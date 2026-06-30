import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from './login-form'

export const metadata = {
  title: 'Iniciar sesión — Grandir CM',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  const { error } = await searchParams
  const notice =
    error === 'cuenta-no-habilitada'
      ? 'Tu cuenta no está habilitada. Contactá a un administrador.'
      : null

  return <LoginForm notice={notice} />
}
