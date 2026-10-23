'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

// Local-only draft of an unsaved form, keyed per calendar day so a
// half-written entry from yesterday never resurfaces. Survives tab
// switches, reloads and app switches; cleared on successful submit.
export function draftKey(name: string, date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `mf:draft:${name}:${y}-${m}-${d}`
}

export function readDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeDraft<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

export function clearDraft(key: string): void {
  try { localStorage.removeItem(key) } catch {}
}

export function useDraft<T>(name: string, initial: T): [T, (next: T | ((prev: T) => T)) => void, () => void, boolean] {
  const key = draftKey(name)
  const [value, setValueState] = useState<T>(initial)
  const [restored, setRestored] = useState(false)
  const hydrated = useRef(false)

  useEffect(() => {
    const saved = readDraft<T>(key)
    if (saved !== null) { setValueState(saved); setRestored(true) }
    hydrated.current = true
  }, [key])

  const setValue = useCallback((next: T | ((prev: T) => T)) => {
    setValueState(prev => {
      const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
      if (hydrated.current) writeDraft(key, v)
      return v
    })
  }, [key])

  const clear = useCallback(() => {
    clearDraft(key)
    setValueState(initial)
    setRestored(false)
  }, [key, initial])

  return [value, setValue, clear, restored]
}
