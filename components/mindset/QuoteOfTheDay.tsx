'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Quote { id: string; text: string; author: string; date: string }

export default function QuoteOfTheDay() {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [shared, setShared] = useState<'copied' | 'failed' | null>(null)

  useEffect(() => {
    fetch('/api/quote')
      .then(r => (r.ok ? r.json() : null))
      .then(q => q && setQuote(q))
      .catch(() => {})
  }, [])

  const share = async () => {
    if (!quote) return
    const text = `“${quote.text}” — ${quote.author}`
    const url = `${window.location.origin}/quote?id=${quote.id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'MindFit Quote of the Day', text, url })
        return
      }
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setShared('copied')
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      setShared('failed')
    }
    setTimeout(() => setShared(null), 2000)
  }

  if (!quote) {
    return <div className="skeleton h-28 mb-6" />
  }

  return (
    <div className="card p-5 mb-6 relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-1 bg-cta" aria-hidden />
      <p className="text-[11px] uppercase tracking-[0.2em] text-cta mb-2">Quote of the day</p>
      <blockquote className="font-display text-lg sm:text-xl leading-snug text-fg-1">
        “{quote.text}”
      </blockquote>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm text-fg-3">— {quote.author}</p>
        <div className="flex items-center gap-1 shrink-0">
          <Link href={`/quote?id=${quote.id}`} className="btn-ghost">
            Card
          </Link>
          <button type="button" onClick={share} className="btn-secondary !py-2 !px-4" aria-label="Share quote">
            {shared === 'copied' ? 'Copied' : shared === 'failed' ? 'Try again' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  )
}
