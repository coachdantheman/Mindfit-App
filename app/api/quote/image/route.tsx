import { ImageResponse } from 'next/og'
import { getQuoteById, getQuoteOfTheDay } from '@/lib/data/quotes'

export const dynamic = 'force-dynamic'

const GOLD = '#C4B400'
const GOLD_DIM = '#9A8B00'
const BG = '#0A0F1A'

// /api/quote/image            → today's quote, 1080x1080 (feed post)
// /api/quote/image?id=mf-001  → a specific quote
// /api/quote/image?format=story → 1080x1920 (Instagram/TikTok story)
export async function GET(req: Request) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const quote = (id && getQuoteById(id)) || getQuoteOfTheDay()
  const story = url.searchParams.get('format') === 'story'
  const width = 1080
  const height = story ? 1920 : 1080

  const len = quote.text.length
  const fontSize = story ? (len <= 60 ? 84 : len <= 100 ? 70 : 58) : len <= 60 ? 72 : len <= 100 ? 58 : 48

  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: story ? '200px 96px' : '96px',
          background: BG,
          color: '#F3F4F6',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 6, height: 44, background: GOLD }} />
          <div style={{ fontSize: 30, letterSpacing: 10, color: GOLD, fontWeight: 400 }}>MINDFIT</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          <div style={{ fontSize: 26, letterSpacing: 6, color: GOLD_DIM, textTransform: 'uppercase' }}>
            Quote of the day
          </div>
          <div style={{ fontSize, lineHeight: 1.2, fontWeight: 500, letterSpacing: -1 }}>
            {`“${quote.text}”`}
          </div>
          <div style={{ fontSize: 34, color: '#9CA3AF' }}>{`— ${quote.author}`}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 24, color: '#6B7280', letterSpacing: 2 }}>
          <div>Peak performance is an identity achievement.</div>
          <div style={{ color: GOLD_DIM }}>mindfit.academy</div>
        </div>
      </div>
    ),
    { width, height }
  )
}
