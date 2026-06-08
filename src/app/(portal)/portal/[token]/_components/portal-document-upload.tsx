'use client'

import { useState, useRef } from 'react'

interface PortalDocumentUploadProps {
  token: string
}

// El tipo "Contrato firmado" se eliminó del portal porque la firma ahora es
// 100 % electrónica (Ley 8454). El inversor solo puede subir comprobantes
// y otros documentos justificativos desde el portal.
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  deposit_receipt: 'Comprobante de depósito',
}

export function PortalDocumentUpload({ token }: PortalDocumentUploadProps) {
  const [docType, setDocType] = useState<string>('deposit_receipt')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    setFile(selected)
    setError(null)
    setSuccess(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    // Validar tamaño (max 20 MB)
    if (file.size > 20 * 1024 * 1024) {
      setError('El archivo no puede superar los 20 MB.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', docType)

      const res = await fetch(`/api/portal/${token}/documents`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        if (data.error === 'UPLOAD_FAILED') {
          setError('Error al subir el archivo. Intenta de nuevo.')
        } else {
          setError('Ocurrió un error. Intenta de nuevo.')
        }
        return
      }

      setSuccess(true)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      // Recargar para mostrar el documento nuevo
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm font-medium">
        Documento subido exitosamente. Actualizando...
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="doc-type"
          className="block text-sm font-medium text-zinc-700 mb-1"
        >
          Tipo de documento
        </label>
        <select
          id="doc-type"
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-500"
        >
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="doc-file"
          className="block text-sm font-medium text-zinc-700 mb-1"
        >
          Archivo <span className="text-zinc-400 font-normal">(PDF, JPG, PNG — max 20 MB)</span>
        </label>
        <input
          ref={fileInputRef}
          id="doc-file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          className="w-full text-sm text-zinc-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:text-zinc-700 file:font-medium hover:file:bg-zinc-200 cursor-pointer"
          required
        />
      </div>

      {file && (
        <p className="text-xs text-zinc-500">
          Archivo seleccionado: <span className="font-medium">{file.name}</span>{' '}
          ({(file.size / 1024).toFixed(0)} KB)
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !file}
        className="w-full rounded-lg bg-zinc-800 px-4 py-2.5 text-white text-sm font-semibold hover:bg-zinc-900 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Subiendo...' : 'Subir documento'}
      </button>
    </form>
  )
}
