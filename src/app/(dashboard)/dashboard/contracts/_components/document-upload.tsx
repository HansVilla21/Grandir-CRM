'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, X } from 'lucide-react'
import type { DocumentType } from '@/types/contracts'

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  draft: 'Borrador',
  signed_contract: 'Contrato firmado',
  deposit_receipt: 'Comprobante de depósito',
  disbursement_receipt: 'Comprobante de desembolso',
  report: 'Reporte',
  addendum: 'Addendum',
}

const DOCUMENT_TYPES: DocumentType[] = [
  'draft',
  'signed_contract',
  'deposit_receipt',
  'disbursement_receipt',
  'report',
  'addendum',
]

interface DocumentUploadProps {
  contractId: string
}

export function DocumentUpload({ contractId }: DocumentUploadProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<DocumentType>('signed_contract')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
    setError(null)
    setSuccess(false)
  }

  function clearFile() {
    setSelectedFile(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  async function handleUpload() {
    if (!selectedFile) return

    setUploading(true)
    setError(null)
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('type', documentType)

      const res = await fetch(`/api/contracts/${contractId}/documents`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al subir el documento')
        return
      }

      setSuccess(true)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      router.refresh()
    } catch {
      setError('Error de red al subir el archivo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-zinc-900 mb-4">Subir documento</h3>

      <div className="space-y-3">
        {/* Document type */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">
            Tipo de documento
          </label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-colors"
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {DOCUMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        {/* File input */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 mb-1">
            Archivo
          </label>

          {selectedFile ? (
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
              <FileText size={16} className="text-zinc-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-900 truncate">{selectedFile.name}</p>
                <p className="text-xs text-zinc-500">{formatBytes(selectedFile.size)}</p>
              </div>
              <button
                type="button"
                onClick={clearFile}
                className="shrink-0 text-zinc-400 hover:text-zinc-600 transition-colors"
                aria-label="Quitar archivo"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 cursor-pointer hover:border-zinc-300 hover:bg-zinc-100 transition-colors">
              <Upload size={20} className="text-zinc-400" />
              <span className="text-sm text-zinc-500">
                Haz clic para seleccionar un archivo
              </span>
              <span className="text-xs text-zinc-400">PDF, JPEG, PNG, WebP — máx. 20 MB</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
          )}
        </div>

        {/* Error / success */}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-600">Documento subido correctamente.</p>
        )}

        {/* Upload button */}
        <button
          type="button"
          disabled={!selectedFile || uploading}
          onClick={handleUpload}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Subiendo...' : 'Subir documento'}
        </button>
      </div>
    </div>
  )
}
