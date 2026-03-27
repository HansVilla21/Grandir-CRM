'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { BulletinListItem } from '@/types/bulletins'
import { TARGET_GROUP_LABELS } from '@/types/bulletins'

interface BulletinsTableProps {
  bulletins: BulletinListItem[]
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium' }).format(
    new Date(iso)
  )
}

export function BulletinsTable({ bulletins }: BulletinsTableProps) {
  const [filter, setFilter] = useState<'all' | 'draft' | 'sent'>('all')

  const filtered =
    filter === 'all' ? bulletins : bulletins.filter((b) => b.status === filter)

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-zinc-100 pb-0">
        {(['all', 'draft', 'sent'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              filter === f
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-700',
            ].join(' ')}
          >
            {f === 'all' ? 'Todos' : f === 'draft' ? 'Borradores' : 'Enviados'}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-400 py-8 text-center">
          No hay boletines en esta categoría.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-400 border-b border-zinc-100">
                <th className="pb-2 pr-4 font-medium">Asunto</th>
                <th className="pb-2 pr-4 font-medium">Grupo objetivo</th>
                <th className="pb-2 pr-4 font-medium text-right">Destinatarios</th>
                <th className="pb-2 pr-4 font-medium">Estado</th>
                <th className="pb-2 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-zinc-50/60 transition-colors">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/dashboard/bulletins/${b.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {b.subject}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-zinc-500">
                    {b.target_group === 'by_plan' && b.target_plan_name
                      ? `Plan ${b.target_plan_name}`
                      : TARGET_GROUP_LABELS[b.target_group] ?? b.target_group}
                  </td>
                  <td className="py-3 pr-4 text-right text-zinc-500">
                    {b.status === 'sent' ? b.recipient_count : '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={[
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        b.status === 'draft'
                          ? 'bg-zinc-100 text-zinc-600'
                          : 'bg-emerald-50 text-emerald-700',
                      ].join(' ')}
                    >
                      {b.status === 'draft' ? 'Borrador' : 'Enviado'}
                    </span>
                  </td>
                  <td className="py-3 text-zinc-400 text-xs">
                    {b.status === 'sent' && b.sent_at
                      ? formatDate(b.sent_at)
                      : formatDate(b.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
