import { NextResponse } from 'next/server'
import { getQuoteOfTheDay } from '@/lib/data/quotes'

export const dynamic = 'force-dynamic'

// Public: the quote is the same for everyone and is also used by the
// shareable /quote page, so no session is required.
export async function GET() {
  const quote = getQuoteOfTheDay()
  return NextResponse.json(quote, {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
  })
}
