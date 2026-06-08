'use client'

import { useState, useRef } from 'react'
import { NotificationsBell } from '@/components/layout/notifications-bell'
import { useMobileSidebar } from './mobile-sidebar-context'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Menu, LogOut } from 'lucide-react'

interface HeaderProps {
  userName: string
  userRole: string
  logoutAction: () => Promise<void>
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

export function Header({ userName, userRole, logoutAction }: HeaderProps) {
  const { toggle } = useMobileSidebar()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  function handleConfirmLogout() {
    setLoggingOut(true)
    formRef.current?.requestSubmit()
  }

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 h-14 bg-white border-b border-zinc-200 shrink-0">
      {/* Left side: hamburger on mobile */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          className="flex lg:hidden items-center justify-center h-9 w-9 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications bell */}
        <NotificationsBell />

        {/* Separador */}
        <div className="h-5 w-px bg-zinc-200" />

        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white select-none">
          {getInitials(userName)}
        </div>

        {/* Info del usuario — hidden on small screens */}
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-zinc-900 leading-none">
            {userName}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {roleLabels[userRole] ?? userRole}
          </p>
        </div>

        {/* Separador */}
        <div className="h-5 w-px bg-zinc-200 hidden sm:block" />

        {/* Logout — opens confirmation, submits hidden form on confirm */}
        <form ref={formRef} action={logoutAction} className="contents">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </form>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Cerrar sesión"
        description="¿Confirmas que quieres cerrar la sesión? Tendrás que iniciar sesión de nuevo para volver a entrar."
        confirmLabel="Cerrar sesión"
        variant="default"
        loading={loggingOut}
        onConfirm={handleConfirmLogout}
        onCancel={() => setConfirmOpen(false)}
      />
    </header>
  )
}
