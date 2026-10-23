'use client'
import { useState } from 'react'

export default function ShareBar({ id, text, author }: { id: string; text: string; author: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  const share = async () => {
    const quote = `“${text}” — ${author}`
    const url = `${window.location.origin}/quote?id=${id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'MindFit Quote of the Day', text: quote, url })
        return
      }
      await navigator.clipboard.writeText(`${quote}\n${url}`)
      setState('copied')
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      setState('failed')
    }
    setTimeout(() => setState('idle'), 2000)
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <button type="button" onClick={share} className="btn-primary">
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Try again' : 'Share'}
      </button>
      <a href={`/api/quote/image?id=${id}&format=story`} download={`mindfit-quote-${id}-story.png`} className="btn-secondary">
        Story image
      </a>
      <a href={`/api/quote/image?id=${id}`} download={`mindfit-quote-${id}.png`} className="btn-secondary">
        Post image
      </a>
    </div>
  )
}
