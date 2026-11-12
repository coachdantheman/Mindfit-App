'use client'
import { useEffect, useRef, useState } from 'react'

const HANDLE = '@mindfitdan'
type Format = 'story' | 'post'

// Images are fetched ahead of time: iOS only opens the share sheet if
// navigator.share runs right inside the tap, not after a network wait.
export default function ShareBar({ id, text, author }: { id: string; text: string; author: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [toast, setToast] = useState<string | null>(null)
  const files = useRef<Partial<Record<Format, File>>>({})

  useEffect(() => {
    for (const f of ['story', 'post'] as Format[]) {
      fetch(`/api/quote/image?id=${id}${f === 'story' ? '&format=story' : ''}`)
        .then(r => (r.ok ? r.blob() : null))
        .then(b => { if (b) files.current[f] = new File([b], `mindfit-quote-${f}.png`, { type: 'image/png' }) })
        .catch(() => {})
    }
  }, [id])

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const share = async () => {
    const quote = `“${text}” ${author}`
    const url = `${window.location.origin}/quote?id=${id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'MindFit Quote', text: `${quote}\n${HANDLE}`, url })
        return
      }
      await navigator.clipboard.writeText(`${quote}\n${url}\n${HANDLE}`)
      setState('copied')
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      setState('failed')
    }
    setTimeout(() => setState('idle'), 2000)
  }

  const shareImage = async (format: Format) => {
    const file = files.current[format]
    navigator.clipboard?.writeText(HANDLE).catch(() => {})
    if (file && navigator.canShare?.({ files: [file] })) {
      try {
        flash(`${HANDLE} copied. Paste it in your ${format === 'story' ? 'story' : 'caption'} to tag MindFit.`)
        await navigator.share({ files: [file], text: HANDLE })
      } catch (e: any) {
        if (e?.name !== 'AbortError') flash('Could not open sharing. Try again.')
      }
      return
    }
    // Desktop browsers without file sharing: save the image instead.
    const a = document.createElement('a')
    a.href = `/api/quote/image?id=${id}${format === 'story' ? '&format=story' : ''}`
    a.download = `mindfit-quote-${id}-${format}.png`
    a.click()
    flash(`Image saved. Tag ${HANDLE} when you post it.`)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={share} className="btn-primary">
          {state === 'copied' ? 'Copied' : state === 'failed' ? 'Try again' : 'Share'}
        </button>
        <button type="button" onClick={() => shareImage('story')} className="btn-secondary">Share to story</button>
        <button type="button" onClick={() => shareImage('post')} className="btn-secondary">Share as post</button>
      </div>
      <p className="text-xs text-center" style={{ color: '#6B7280' }}>Opens your share sheet. Pick Instagram, then tag {HANDLE}.</p>
      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] rounded-xl border px-4 py-2.5 text-sm"
          style={{ background: '#111827', borderColor: '#C4B400', color: '#F3F4F6' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
