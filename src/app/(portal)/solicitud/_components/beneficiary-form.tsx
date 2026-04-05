'use client'

import { X } from 'lucide-react'
import { formatCedula } from '@/lib/investment/format'
import { COUNTRY_CODES } from '@/lib/investment/country-codes'

export interface BeneficiaryInput {
  full_name: string
  cedula: string
  phone_code: string
  phone_number: string
}

interface BeneficiaryFormProps {
  index: number
  value: BeneficiaryInput
  onChange: (value: BeneficiaryInput) => void
  onRemove: () => void
}

export function BeneficiaryForm({ index, value, onChange, onRemove }: BeneficiaryFormProps) {
  function update<K extends keyof BeneficiaryInput>(field: K, val: BeneficiaryInput[K]) {
    onChange({ ...value, [field]: val })
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-colors'

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-zinc-900">Beneficiario {index + 1}</h4>
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center justify-center h-7 w-7 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          aria-label="Eliminar beneficiario"
        >
          <X size={16} />
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Nombre completo</label>
        <input
          type="text"
          value={value.full_name}
          onChange={(e) => update('full_name', e.target.value)}
          placeholder="Nombre del beneficiario"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Cédula</label>
        <input
          type="text"
          value={value.cedula}
          onChange={(e) => update('cedula', formatCedula(e.target.value))}
          placeholder="X-XXXX-XXXX"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Teléfono</label>
        <div className="flex gap-2">
          <select
            value={value.phone_code}
            onChange={(e) => update('phone_code', e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-green-500/20"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.country} value={c.code}>
                {c.country} {c.code}
              </option>
            ))}
          </select>
          <input
            type="tel"
            value={value.phone_number}
            onChange={(e) => update('phone_number', e.target.value.replace(/\D/g, ''))}
            placeholder="88887777"
            className={`${inputClass} flex-1`}
          />
        </div>
      </div>
    </div>
  )
}
