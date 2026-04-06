'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

/** Auto-format cedula as X-XXXX-XXXX */
function formatCedula(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 1) return digits
  if (digits.length <= 5) return `${digits.slice(0, 1)}-${digits.slice(1)}`
  return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5)}`
}

// ── Types ───────────────────────────────────────────────────────────────────

type Step = 'identity' | 'verification' | 'confirmation' | 'success'

interface SigningFlowProps {
  token: string
  amount: number
}

// ── Component ───────────────────────────────────────────────────────────────

export function SigningFlow({ token, amount }: SigningFlowProps) {
  const [step, setStep] = useState<Step>('identity')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')

  // Identity inputs
  const [cedula, setCedula] = useState('')

  // Verification
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(0)

  // Confirmation
  const [accepted, setAccepted] = useState(false)

  // ── Cooldown timer ──────────────────────────────────────────────────────

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  // ── Step 1: Request code ────────────────────────────────────────────────

  const handleRequestCode = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/portal/${token}/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: cedula.replace(/\D/g, '') }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? data.error ?? 'Error al verificar identidad')
        return
      }
      setMaskedEmail(data.masked_email ?? '')
      setCooldown(60)
      setStep('verification')
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [token, cedula])

  // ── Resend code ─────────────────────────────────────────────────────────

  const handleResendCode = useCallback(async () => {
    if (cooldown > 0) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/portal/${token}/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: cedula.replace(/\D/g, '') }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? data.error ?? 'Error al reenviar codigo')
        return
      }
      setCooldown(60)
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [token, cedula, cooldown])

  // ── Step 3: Sign contract ───────────────────────────────────────────────

  const handleSign = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/portal/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) {
        // If code-related error, go back to verification step
        const codeErrors = ['INVALID_CODE', 'CODE_EXPIRED', 'CODE_NOT_FOUND', 'MAX_ATTEMPTS']
        if (codeErrors.includes(data.code)) {
          setCode('')
          setStep('verification')
        }
        setError(data.error ?? 'Error al firmar el contrato')
        return
      }
      setStep('success')
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [token, code])

  // ── Step indicator ──────────────────────────────────────────────────────

  const stepLabels: Record<Exclude<Step, 'success'>, string> = {
    identity: 'Verificacion de identidad',
    verification: 'Codigo de verificacion',
    confirmation: 'Confirmacion y firma',
  }

  const stepNumber = step === 'identity' ? 1 : step === 'verification' ? 2 : 3

  // ── Input classes ─────────────────────────────────────────────────────

  const inputClass =
    'w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-400 outline-none'
  const buttonClass =
    'w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
  const errorClass =
    'rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700'

  // ── Success screen ────────────────────────────────────────────────────

  if (step === 'success') {
    return (
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 sm:p-6 space-y-4 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-zinc-900">Contrato firmado</h2>
        <p className="text-sm text-zinc-600">
          Tu contrato ha sido firmado exitosamente. Tambien enviamos una copia a
          tu email.
        </p>
        <button
          onClick={() => window.location.reload()}
          className={buttonClass}
        >
          Ver contrato firmado
        </button>
      </div>
    )
  }

  // ── Main flow ─────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 sm:p-6 space-y-4">
      {/* Step indicator */}
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
        Paso {stepNumber} de 3 &mdash; {stepLabels[step as Exclude<Step, 'success'>]}
      </p>

      {/* Error */}
      {error && <div className={errorClass}>{error}</div>}

      {/* Step 1: Identity */}
      {step === 'identity' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Verifica tu identidad
            </h2>
            <p className="text-sm text-zinc-600 mt-1">
              Ingresa tu numero de cedula para verificar que eres el titular del contrato.
            </p>
          </div>

          <div>
            <label
              htmlFor="signing-cedula"
              className="block text-sm font-medium text-zinc-700 mb-1"
            >
              Numero de cedula
            </label>
            <input
              id="signing-cedula"
              type="text"
              value={cedula}
              onChange={(e) => setCedula(formatCedula(e.target.value))}
              placeholder="X-XXXX-XXXX"
              className={inputClass}
            />
          </div>

          <button
            onClick={handleRequestCode}
            disabled={loading || cedula.replace(/\D/g, '').length < 9}
            className={buttonClass}
          >
            {loading ? 'Verificando...' : 'Verificar identidad'}
          </button>
        </div>
      )}

      {/* Step 2: Verification */}
      {step === 'verification' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Codigo de verificacion
            </h2>
            <p className="text-sm text-zinc-600 mt-1">
              Enviamos un codigo de 6 digitos a{' '}
              <span className="font-medium text-zinc-800">{maskedEmail}</span>
            </p>
          </div>

          <div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className={`${inputClass} text-center text-2xl font-mono tracking-[0.3em]`}
            />
          </div>

          <button
            onClick={() => {
              setError('')
              setStep('confirmation')
            }}
            disabled={code.length !== 6}
            className={buttonClass}
          >
            Continuar
          </button>

          <div className="text-center">
            {cooldown > 0 ? (
              <p className="text-xs text-zinc-500">
                Reenviar codigo en {cooldown}s
              </p>
            ) : (
              <button
                onClick={handleResendCode}
                disabled={loading}
                className="text-sm font-medium text-green-700 hover:text-green-800 hover:underline disabled:opacity-50"
              >
                Reenviar codigo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 'confirmation' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Confirma y firma tu contrato
            </h2>
            <p className="text-sm text-zinc-600 mt-1">
              Estas a punto de firmar un contrato por{' '}
              <span className="font-bold text-zinc-900">
                {formatCurrency(amount)}
              </span>
            </p>
          </div>

          <ul className="space-y-2 text-sm text-zinc-700">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-green-600 shrink-0">&#10003;</span>
              He leido los terminos del contrato
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-green-600 shrink-0">&#10003;</span>
              Acepto las condiciones establecidas
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-green-600 shrink-0">&#10003;</span>
              La informacion proporcionada es veridica
            </li>
          </ul>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500/20"
            />
            <span className="text-sm text-zinc-700">
              He leido el contrato y acepto todos los terminos y condiciones
              establecidos
            </span>
          </label>

          <p className="text-xs text-zinc-400 leading-relaxed">
            De conformidad con la Ley N&deg; 8454 de Certificados, Firmas
            Digitales y Documentos Electronicos de Costa Rica, esta firma
            electronica tiene plena validez juridica y equivale a una firma
            manuscrita.
          </p>

          <button
            onClick={handleSign}
            disabled={loading || !accepted}
            className={buttonClass}
          >
            {loading ? 'Firmando...' : 'Firmar contrato'}
          </button>
        </div>
      )}
    </div>
  )
}
