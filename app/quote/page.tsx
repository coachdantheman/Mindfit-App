import type { Metadata } from 'next'
import Link from 'next/link'
import { getQuoteById, getQuoteOfTheDay } from '@/lib/data/quotes'
import ShareBar from './ShareBar'

export const dynamic = 'force-dynamic'

type Props = { searchParams: { id?: string } }

function resolve(id?: string) {
  return (id && getQuoteById(id)) || getQuoteOfTheDay()
}

export function generateMetadata({ searchParams }: Props): Metadata {
  const q = resolve(searchParams.id)
  const title = 'MindFit | Quote of the Day'
  const description = `“${q.text}” — ${q.author}`
  const image = `/api/quote/image?id=${q.id}`
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1080, height: 1080 }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default function QuotePage({ searchParams }: Props) {
  const q = resolve(searchParams.id)
  const len = q.text.length
  const size = len <= 60 ? 'text-4xl sm:text-6xl' : len <= 100 ? 'text-3xl sm:text-5xl' : 'text-2xl sm:text-4xl'

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: '#0A0F1A' }}>
      <div className="w-full max-w-2xl flex flex-col gap-10">
        <div className="flex items-center gap-4">
          <span className="block w-1 h-8" style={{ background: '#C4B400' }} aria-hidden />
          <span className="font-display tracking-[0.35em] text-sm" style={{ color: '#C4B400' }}>MINDFIT</span>
        </div>

        <div className="flex flex-col gap-6">
          <p className="text-xs uppercase tracking-[0.3em]" style={{ color: '#9A8B00' }}>Quote of the day</p>
          <blockquote className={`font-display leading-tight ${size}`} style={{ color: '#F3F4F6' }}>
            {'“'}{q.text}{'”'}
          </blockquote>
          <p className="text-lg" style={{ color: '#9CA3AF' }}>{'—'} {q.author}</p>
        </div>

        <p className="text-xs tracking-[0.15em] uppercase" style={{ color: '#6B7280' }}>
          Peak performance is an identity achievement.
        </p>

        <ShareBar id={q.id} text={q.text} author={q.author} />

        <Link href="/mindset" className="text-sm text-center" style={{ color: '#9A8B00' }}>
          Open MindFit {'→'}
        </Link>
      </div>
    </main>
  )
}
