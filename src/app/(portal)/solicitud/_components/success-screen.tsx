'use client'

import { Check } from 'lucide-react'

export function SuccessScreen() {
  return (
    <div className="max-w-md mx-auto text-center space-y-6 py-12">
      <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <Check size={32} className="text-green-600" strokeWidth={3} />
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">¡Solicitud recibida!</h1>
        <p className="text-sm text-zinc-600 leading-relaxed">
          Hemos recibido tu solicitud. El equipo de Grandir CM se pondrá en contacto contigo
          pronto para continuar el proceso.
        </p>
      </div>

      <p className="text-xs text-zinc-400">
        Si tienes alguna consulta, puedes escribirnos directamente.
      </p>
    </div>
  )
}
