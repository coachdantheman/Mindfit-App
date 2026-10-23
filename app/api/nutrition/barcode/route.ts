import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { isValidBarcode, lookupCandidates, normalizeOffProduct } from '@/lib/barcode'

export const maxDuration = 20

const OFF_FIELDS = 'product_name,product_name_en,brands,serving_size,serving_quantity,nutriments'

// Resolve a barcode to a foods row. Cached rows (any user's, or global)
// are returned without calling Open Food Facts.
export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const code = (new URL(req.url).searchParams.get('code') ?? '').replace(/\D/g, '')
  if (!isValidBarcode(code)) return NextResponse.json({ error: 'That doesn’t look like a valid barcode.' }, { status: 400 })

  const admin = createAdminClient()
  const candidates = lookupCandidates(code)

  const { data: cached } = await admin
    .from('foods')
    .select('*')
    .in('barcode', candidates)
    .order('user_id', { ascending: true, nullsFirst: true })
    .limit(1)
    .maybeSingle()
  if (cached) return NextResponse.json(cached)

  let product: ReturnType<typeof normalizeOffProduct> = null
  let matched = code
  for (const c of candidates) {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${c}.json?fields=${OFF_FIELDS}`, {
        headers: { 'User-Agent': 'MindFit/1.0 (mindfit-app.vercel.app)' },
        next: { revalidate: 0 },
      })
      if (!res.ok) continue
      const json = await res.json()
      product = normalizeOffProduct(json?.product)
      if (product) { matched = c; break }
    } catch {
      // try the next candidate
    }
  }
  if (!product) return NextResponse.json({ error: 'Not in the database yet.' }, { status: 404 })

  const { data, error } = await admin
    .from('foods')
    .insert({ user_id: auth.userId, ...product, category: 'other', source: 'barcode', barcode: matched })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
