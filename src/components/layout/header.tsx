import { logout } from '@/lib/auth/actions'
import { NotificationsBell } from '@/components/layout/notifications-bell'

interface HeaderProps {
  userName: string
  userRole: string
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  assistant: 'Asistente',
}

export function Header({ userName, userRole }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 h-14 bg-white border-b border-zinc-200 shrink-0">
      <div />

      <div className="flex items-center gap-3">
        {/* Notifications bell */}
        <NotificationsBell />

        {/* Separador */}
        <div className="h-5 w-px bg-zinc-200" />

        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white select-none">
          {getInitials(userName)}
        </div>

        {/* Info del usuario */}
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-zinc-900 leading-none">
            {userName}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {roleLabels[userRole] ?? userRole}
          </p>
        </div>

        {/* Separador */}
        <div className="h-5 w-px bg-zinc-200" />

        {/* Logout */}
        <form action={logout}>
          <button
            type="submit"
            className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Salir
          </button>
        </form>
      </div>
    </header>
  )
}
