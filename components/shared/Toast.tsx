'use client'
import { createContext, useCallback, useContext, useRef, useState } from 'react'

type Kind = 'success' | 'error'
interface ToastState { msg: string; kind: Kind }

const ToastContext = createContext<(msg: string, kind?: Kind) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const notify = useCallback((msg: string, kind: Kind = 'success') => {
    setToast({ msg, kind })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), kind === 'error' ? 4000 : 2500)
  }, [])

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toast && (
        <div
          role="status"
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-[92vw] bg-surface border text-sm px-4 py-2.5 rounded-xl shadow-lg ${
            toast.kind === 'error' ? 'border-red-500/40 text-red-400' : 'border-cta/40 text-fg-1'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </ToastContext.Provider>
  )
}
