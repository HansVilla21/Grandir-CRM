'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  show: (type: ToastType, message: string) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<ToastType, typeof AlertCircle> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

const STYLES: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-zinc-50 border-zinc-200 text-zinc-800',
}

const ICON_STYLES: Record<ToastType, string> = {
  success: 'text-green-600',
  error: 'text-red-600',
  info: 'text-zinc-600',
}

let toastIdCounter = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((type: ToastType, message: string) => {
    const id = ++toastIdCounter
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const value: ToastContextValue = {
    show,
    success: (m) => show('success', m),
    error: (m) => show('error', m),
    info: (m) => show('info', m),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm w-[calc(100%-2rem)]">
        {toasts.map((t) => (
          <ToastItemView key={t.id} item={t} onClose={() => setToasts((p) => p.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItemView({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const Icon = ICONS[item.type]
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className={cn(
        'pointer-events-auto rounded-lg border px-4 py-3 shadow-md flex items-start gap-3 transition-all duration-200',
        STYLES[item.type],
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}
    >
      <Icon size={16} className={cn('shrink-0 mt-0.5', ICON_STYLES[item.type])} />
      <p className="text-sm flex-1 leading-relaxed">{item.message}</p>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-md p-0.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/50 transition-colors"
        aria-label="Cerrar"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
