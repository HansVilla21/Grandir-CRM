'use client'

import { useEffect, useRef } from 'react'

const STORAGE_KEY = 'grandir_application_draft'
const DEBOUNCE_MS = 500

export function useFormDraft<T>(
  values: T,
  setValues: (values: T) => void
) {
  const hasLoadedRef = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load draft on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setValues(parsed)
      }
    } catch {
      // ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Save draft on changes (debounced)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!hasLoadedRef.current) return

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(values))
      } catch {
        // ignore quota errors
      }
    }, DEBOUNCE_MS)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [values])

  function clearDraft() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
  }

  return { clearDraft }
}
