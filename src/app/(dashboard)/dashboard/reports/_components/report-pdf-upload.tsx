'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, CheckCircle } from 'lucide-react'

interface ReportPdfUploadProps {
  reportId: string
  currentPdfPath: string | null
}

export function ReportPdfUpload({ reportId, currentPdfPath }: ReportPdfUploadProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setError('Solo se aceptan archivos PDF.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/reports/${reportId}/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Error al subir el PDF')
        return
      }

      setSuccess(true)
      router.refresh()
    } catch {
      setError('Error de red. Intenta de nuevo.')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        {currentPdfPath
          ? 'Reemplazar PDF existente'
          : 'Subir PDF del reporte'}
      </p>

      <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 border border-zinc-200 rounded-lg cursor-pointer hover:bg-zinc-200 transition-colors">
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Upload size={14} />
        )}
        {loading ? 'Subiendo...' : 'Seleccionar PDF'}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={loading}
          className="sr-only"
        />
      </label>

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle size={14} />
          PDF subido correctamente. Estado actualizado a &ldquo;PDF listo&rdquo;.
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
