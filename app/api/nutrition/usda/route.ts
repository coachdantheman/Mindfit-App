import { NextResponse } from 'next/server'
import { verifyApiUser } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { normalizeUsdaFood } from '@/lib/usda'

export const maxDuration = 15

const DATA_TYPES = 'Foundation,SR%20Legacy,Survey%20(FNDDS),Branded'

// Adds USDA FoodData Central results to the local food search. Any failure
// returns an empty list so the athlete still sees their local foods.
export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const q = (new URL(req.url).searchParams.get('q') ?? '').trim()
  if (q.length < 3 || q.length > 80) return NextResponse.json([])

  const limited = await rateLimit(`usda:${auth.userId}`, 120, 3600)
  if (limited) return limited

  const key = process.env.USDA_API_KEY
  if (!key) return NextResponse.json([])

  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}&query=${encodeURIComponent(q)}&pageSize=15&dataType=${DATA_TYPES}`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' })
    if (!res.ok) return NextResponse.json([])
    const json = await res.json()
    const foods = (Array.isArray(json?.foods) ? json.foods : [])
      .map((f: unknown) => normalizeUsdaFood(f))
      .filter((f: ReturnType<typeof normalizeUsdaFood>) => f != null)
    return NextResponse.json(foods)
  } catch {
    return NextResponse.json([])
  }
}
