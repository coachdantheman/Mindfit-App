// Upserts the curated food library into Supabase. Run with:
//   set -a; . ./.env.local; set +a; npx tsx scripts/seed-foods.ts
import { createClient } from '@supabase/supabase-js'
import { FOODS_SEED } from '../lib/data/foods-seed'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const rows = FOODS_SEED.map(f => ({ ...f, brand: f.brand ?? null, serving_grams: f.serving_grams ?? null, source: 'curated' as const }))
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await admin.from('foods').upsert(rows.slice(i, i + 100), { onConflict: 'slug' })
    if (error) throw error
  }
  const { count } = await admin.from('foods').select('*', { count: 'exact', head: true }).is('user_id', null)
  console.log(`curated foods in db: ${count}`)
}
main().catch(e => { console.error(e); process.exit(1) })
