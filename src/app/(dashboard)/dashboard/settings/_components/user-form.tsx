'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

interface SystemUser {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'assistant'
  active: boolean
}

interface UserFormProps {
  user?: SystemUser
  onClose: () => void
}

export function UserForm({ user, onClose }: UserFormProps) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isEdit = !!user

  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'assistant'>(user?.role ?? 'assistant')
  const [active, setActive] = useState(user?.active ?? true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) {
      setError('El nombre es requerido')
      return
    }

    if (!isEdit) {
      if (!email.trim()) {
        setError('El email es requerido')
        return
      }
      if (password.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres')
        return
      }
    }

    setLoading(true)

    try {
      let res: Response

      if (isEdit) {
        res = await fetch(`/api/settings/users/${user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name: fullName, role, active }),
        })
      } else {
        res = await fetch('/api/settings/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, full_name: fullName, role }),
        })
      }

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error inesperado')
        return
      }

      router.refresh()
      onClose()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <dialog
        ref={dialogRef}
        open
        className="relative w-full max-w-md rounded-t-xl sm:rounded-xl bg-white p-4 sm:p-6 shadow-xl m-0 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-zinc-900">
            {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Nombre completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombre completo"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-colors"
            />
          </div>

          {/* Email — solo en modo crear */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-colors"
              />
            </div>
          )}

          {/* Contraseña — solo en modo crear */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-colors"
              />
            </div>
          )}

          {/* Rol */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'assistant')}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-colors bg-white"
            >
              <option value="admin">Administrador</option>
              <option value="assistant">Asistente</option>
            </select>
          </div>

          {/* Activo — solo en modo editar */}
          {isEdit && (
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-zinc-700">Estado</label>
              <button
                type="button"
                onClick={() => setActive(!active)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  active ? 'bg-zinc-900' : 'bg-zinc-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    active ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <span className="text-xs text-zinc-500">{active ? 'Activo' : 'Inactivo'}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
