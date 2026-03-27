'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, UserX } from 'lucide-react'
import { UserForm } from './user-form'

interface SystemUser {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'assistant'
  active: boolean
  created_at: string
}

interface UsersSectionProps {
  users: SystemUser[]
  currentUserRole: 'admin' | 'assistant'
}

export function UsersSection({ users, currentUserRole }: UsersSectionProps) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<SystemUser | undefined>(undefined)
  const [deactivating, setDeactivating] = useState<string | null>(null)

  if (currentUserRole !== 'admin') {
    return (
      <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-6 py-10 text-center">
        <p className="text-sm text-zinc-500">Sin acceso. Solo los administradores pueden gestionar usuarios.</p>
      </div>
    )
  }

  async function handleDeactivate(userId: string) {
    if (!confirm('¿Desactivar este usuario?')) return
    setDeactivating(userId)
    try {
      await fetch(`/api/settings/users/${userId}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setDeactivating(null)
    }
  }

  function openCreate() {
    setEditingUser(undefined)
    setShowForm(true)
  }

  function openEdit(user: SystemUser) {
    setEditingUser(user)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingUser(undefined)
  }

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Usuarios del sistema</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Administradores y asistentes con acceso al CRM</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-700 transition-colors self-start sm:self-auto"
        >
          <Plus size={14} />
          Nuevo usuario
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Nombre</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Email</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Rol</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Creado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs text-zinc-400">
                  No hay usuarios registrados
                </td>
              </tr>
            )}
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-zinc-50/60 transition-colors">
                <td className="px-4 py-3 text-zinc-900 font-medium">{user.full_name}</td>
                <td className="px-4 py-3 text-zinc-500">{user.email}</td>
                <td className="px-4 py-3">
                  {user.role === 'admin' ? (
                    <span className="inline-flex items-center rounded-md bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                      Asistente
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {user.active ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-400 text-xs">
                  {new Date(user.created_at).toLocaleDateString('es-CR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => openEdit(user)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                      title="Editar"
                    >
                      <Pencil size={13} />
                    </button>
                    {user.active && (
                      <button
                        onClick={() => handleDeactivate(user.id)}
                        disabled={deactivating === user.id}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                        title="Desactivar"
                      >
                        <UserX size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <UserForm user={editingUser} onClose={closeForm} />
      )}
    </section>
  )
}
