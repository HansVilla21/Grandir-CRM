'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface DocumentDownloadButtonProps {
  storagePath: string
  fileName: string
}

export function DocumentDownloadButton({
  storagePath,
  fileName,
}: DocumentDownloadButtonProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/contracts/document-url?path=${encodeURIComponent(storagePath)}`,
      )
      const data = await res.json()
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'No se pudo abrir el documento')
        return
      }
      // Open in new tab. Browsers display PDFs/images inline; binary files download.
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:underline disabled:opacity-50 shrink-0"
      title={`Descargar ${fileName}`}
      aria-label={`Descargar ${fileName}`}
    >
      {loading ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <Download size={13} />
      )}
      Descargar
    </button>
  )
}
