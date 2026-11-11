// Fills leaderboard_scores for every ranked profile. Run once after
// migration v42, and any time the scoring rules change:
//   npx tsx scripts/backfill-leaderboard.ts
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { refreshScore } from '../lib/leaderboard-scores'
import { isValidTimeZone } from '../lib/leaderboard'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter(l => /^[A-Z_]+=/.test(l))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')])
)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function main() {
  const { data: prefs } = await admin.from('notification_prefs').select('user_id, timezone')
  const tzOf = new Map((prefs ?? []).map(p => [p.user_id, p.timezone]))
  let done = 0
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from('profiles').select('id').in('role', ['member', 'coach', 'admin']).order('id').range(from, from + 999)
    if (error) throw error
    for (let i = 0; i < (data ?? []).length; i += 10) {
      await Promise.all(data!.slice(i, i + 10).map(p => {
        const tz = tzOf.get(p.id)
        return refreshScore(admin, p.id, tz && isValidTimeZone(tz) ? tz : 'America/New_York')
      }))
      done += Math.min(10, data!.length - i)
    }
    if (!data || data.length < 1000) break
  }
  const { count } = await admin.from('leaderboard_scores').select('*', { count: 'exact', head: true }).gt('points', 0)
  console.log(`refreshed ${done} profiles; ${count} month rows have points`)
}
main().catch(e => { console.error(e); process.exit(1) })
