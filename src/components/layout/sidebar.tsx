'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  BarChart2,
  Newspaper,
  Bell,
  GitBranch,
  Settings,
  HelpCircle,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMobileSidebar } from './mobile-sidebar-context'

const navSections = [
  {
    label: 'General',
    items: [
      { label: 'Inicio',          href: '/dashboard',              icon: LayoutDashboard },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { label: 'Inversionistas',  href: '/dashboard/investors',    icon: Users },
      { label: 'Contratos',       href: '/dashboard/contracts',    icon: FileText },
      { label: 'Pagos',           href: '/dashboard/payments',     icon: CreditCard },
      { label: 'Referidos',       href: '/dashboard/referrals',    icon: GitBranch },
    ],
  },
  {
    label: 'Comunicación',
    items: [
      { label: 'Reportes',        href: '/dashboard/reports',      icon: BarChart2 },
      { label: 'Boletines',       href: '/dashboard/bulletins',    icon: Newspaper },
      { label: 'Notificaciones',  href: '/dashboard/notifications',icon: Bell },
    ],
  },
]

const bottomItems = [
  { label: 'Ayuda',          href: '/dashboard/help',     icon: HelpCircle },
  { label: 'Configuración',  href: '/dashboard/settings', icon: Settings },
]

function SidebarContent() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Nav principal */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                    )}
                  >
                    <Icon size={16} strokeWidth={1.75} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Items de abajo */}
      <div className="px-3 pb-4 border-t border-zinc-800 pt-3 space-y-0.5">
        {bottomItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
              )}
            >
              <Icon size={16} strokeWidth={1.75} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </>
  )
}

export function Sidebar() {
  const { isOpen, close } = useMobileSidebar()

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <aside className="hidden lg:block w-60 shrink-0 bg-zinc-900 min-h-screen">
        <div className="flex flex-col h-full">
          <div className="px-6 py-5 border-b border-zinc-800">
            <span className="text-base font-semibold tracking-tight text-white">
              Grandir CM
            </span>
          </div>
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile sidebar — only rendered when open, so it never appears on desktop */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={close}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
              <span className="text-base font-semibold tracking-tight text-white">
                Grandir CM
              </span>
              <button
                type="button"
                onClick={close}
                className="flex items-center justify-center h-8 w-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                aria-label="Cerrar menú"
              >
                <X size={18} />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  )
}
