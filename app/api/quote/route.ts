import { NextResponse } from 'next/server'
import { getQuoteOfTheDay } from '@/lib/data/quotes'
import { clientIp, memoryLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Public: the quote is the same for everyone and is also used by the
// shareable /quote page, so no session is required.
export async function GET(req: Request) {
  const limited = memoryLimit(`quote:${clientIp(req)}`, 120, 60_000)
  if (limited) return limited
  const quote = getQuoteOfTheDay()
  return NextResponse.json(quote, {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
  })
}
