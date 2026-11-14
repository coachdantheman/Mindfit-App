import type { SupabaseClient } from '@supabase/supabase-js'
import { STARTERS, isGuideKey, isStarter, shownStage, type GuideIcon, type GuideKey } from '@/lib/guide-characters'
import { monthBounds } from '@/lib/leaderboard'
import { refreshScore, timezoneFor } from '@/lib/leaderboard-scores'
import { calcMPI } from '@/lib/mpi'

// What an athlete has done so far, as far as unlocking characters goes.
export interface UnlockFacts {
  owned: GuideKey[]
  bestStreak: number
  clutchDays: number
  maxLeagueTier: number
  titles: string[]
  levels: string[]
  tierUps: number
  journals: number
  mpiGain: number
}

// Every character the facts earn that the athlete does not own yet. The two
// starters they did not pick come at the first Clutch Day and a 14-day best
// streak, in list order.
export function newlyEarned(f: UnlockFacts): GuideKey[] {
  const owned = new Set<GuideKey>(f.owned)
  const earned: GuideKey[] = []
  const give = (key: GuideKey, when: boolean) => { if (when && !owned.has(key) && !earned.includes(key)) earned.push(key) }

  if (f.owned.some(isStarter)) {
    const mine = f.owned.find(isStarter)
    const others = STARTERS.map(s => s.key).filter(k => k !== mine)
    give(others[0], f.clutchDays >= 1)
    give(others[1], f.bestStreak >= 14)
  }
  give('fox', f.maxLeagueTier >= 3)
  give('lion', f.maxLeagueTier >= 5)
  give('phoenix', f.maxLeagueTier >= 6)
  give('owl', f.titles.includes('monk'))
  give('bull', f.titles.includes('gym_rat'))
  give('raccoon', f.titles.includes('chef'))
  give('sloth', f.titles.includes('recharger'))
  give('tiger', f.clutchDays >= 10)
  give('stag', f.levels.includes('legend'))
  give('ram', f.tierUps >= 1)
  give('chameleon', f.mpiGain >= 10)
  give('beaver', f.journals >= 30)
  return earned
}

// outfits: every title the athlete has held (a wardrobe they keep). title: this month's.
// progress: how far along each countable character is, as [have, need].
// dragonMonths: the months ('YYYY-MM') the athlete finished #1.
export interface Collection {
  owned: GuideKey[]
  fresh: GuideKey[]
  outfits: string[]
  title: string | null
  progress: Partial<Record<GuideKey, [number, number]>>
  dragonMonths: string[]
  bestStreak: number
}

// The dragon race starts with this month; earlier months are not awarded.
export const FIRST_DRAGON_MONTH = '2026-11'

export function progressFor(f: UnlockFacts): Partial<Record<GuideKey, [number, number]>> {
  const mine = f.owned.find(isStarter)
  const others = STARTERS.map(s => s.key).filter(k => k !== mine)
  const p: Partial<Record<GuideKey, [number, number]>> = {
    fox: [f.maxLeagueTier, 3], lion: [f.maxLeagueTier, 5], phoenix: [f.maxLeagueTier, 6],
    tiger: [f.clutchDays, 10], ram: [f.tierUps, 1], chameleon: [Math.max(0, f.mpiGain), 10], beaver: [f.journals, 30],
  }
  if (mine) { p[others[0]] = [f.clutchDays, 1]; p[others[1]] = [f.bestStreak, 14] }
  for (const k of Object.keys(p) as GuideKey[]) p[k] = [Math.min(p[k]![0], p[k]![1]), p[k]![1]]
  return p
}

// Reads what the athlete owns, awards anything newly earned, and returns both.
// `fresh` are characters they have not been told about yet.
export async function loadCollection(admin: SupabaseClient, userId: string): Promise<Collection> {
  const [rows, profile, scores, league, snaps, lifts, journals, weekly] = await Promise.all([
    // Oldest first, so the first starter in the list is the one they picked.
    admin.from('guide_unlocks').select('key, seen, meta').eq('user_id', userId).order('unlocked_at', { ascending: true }),
    admin.from('profiles').select('best_streak, guide_character, role').eq('id', userId).maybeSingle(),
    admin.from('leaderboard_scores').select('clutch_days').eq('user_id', userId),
    admin.from('league_members').select('tier').eq('user_id', userId).order('tier', { ascending: false }).limit(1),
    admin.from('progress_snapshots').select('month, level, title').eq('user_id', userId).order('month', { ascending: false }),
    admin.from('workout_logs').select('id', { head: true, count: 'exact' }).eq('user_id', userId).gt('tier_ups', 0),
    admin.from('journal_entries').select('id', { head: true, count: 'exact' }).eq('user_id', userId),
    admin.from('weekly_assessments').select('*').eq('user_id', userId).order('week_date', { ascending: false }),
  ])
  if (rows.error) throw rows.error

  const have = (rows.data ?? []) as { key: GuideKey; seen: boolean; meta: { months?: string[] } | null }[]
  const owned = have.map(r => r.key)
  // A starter picked before unlocks existed, or picked just now, is owned.
  const starter = profile.data?.guide_character
  const add: { key: GuideKey; seen: boolean }[] = []
  if (isStarter(starter) && !owned.some(isStarter)) add.push({ key: starter, seen: true })
  // Admins never win the monthly award (it goes to the top athlete), so they
  // get the Dragon outright, with no month on it, to see what the winner sees.
  if (profile.data?.role === 'admin' && !owned.includes('dragon')) add.push({ key: 'dragon', seen: false })

  const all = weekly.data ?? []
  const baseline = [...all].reverse().find(a => a.assessment_type === 'baseline')
  const facts: UnlockFacts = {
    owned: [...owned, ...add.map(a => a.key)],
    bestStreak: profile.data?.best_streak ?? 0,
    clutchDays: (scores.data ?? []).reduce((n, r) => n + (r.clutch_days ?? 0), 0),
    maxLeagueTier: league.data?.[0]?.tier ?? 0,
    titles: (snaps.data ?? []).map(s => s.title).filter((t): t is string => !!t),
    levels: (snaps.data ?? []).map(s => s.level),
    tierUps: lifts.count ?? 0,
    journals: journals.count ?? 0,
    mpiGain: all[0] && baseline ? calcMPI(all[0]) - calcMPI(baseline) : 0,
  }
  for (const key of newlyEarned(facts)) add.push({ key, seen: false })

  if (add.length) {
    const { error } = await admin.from('guide_unlocks').upsert(add.map(a => ({ user_id: userId, key: a.key, seen: a.seen })), { onConflict: 'user_id,key', ignoreDuplicates: true })
    if (error) throw error
  }
  return {
    progress: progressFor(facts),
    dragonMonths: [...new Set(have.find(r => r.key === 'dragon')?.meta?.months ?? [])],
    bestStreak: facts.bestStreak,
    outfits: [...new Set(facts.titles)],
    title: snaps.data?.[0]?.title ?? null,
    owned: [...owned, ...add.map(a => a.key)],
    fresh: [...have.filter(r => !r.seen).map(r => r.key), ...add.filter(a => !a.seen).map(a => a.key)],
  }
}

// The Dragon goes to last month's #1 member on The Board (ties all win). Runs
// from the hourly job: by the 2nd (UTC) the month is over in every timezone,
// and a month that has a winner is never awarded again. Returns new winners.
export async function awardDragon(admin: SupabaseClient, now = new Date()): Promise<{ month: string; winners: string[] }> {
  const month = monthBounds(now, 'UTC').lastMonth
  const none = { month, winners: [] }
  if (now.getUTCDate() < 2 || now.getUTCDate() > 5 || month < FIRST_DRAGON_MONTH) return none
  const done = await admin.from('guide_unlocks').select('user_id', { head: true, count: 'exact' }).eq('key', 'dragon').contains('meta', { months: [month] })
  if (done.error || done.count) return none
  // A stored score is only as new as the athlete's last visit, so the leaders'
  // final numbers are rebuilt before anyone is named.
  const { data: top } = await admin.from('leaderboard_scores').select('user_id').eq('month', month).gt('points', 0).order('points', { ascending: false }).limit(10)
  for (const r of top ?? []) await refreshScore(admin, r.user_id, await timezoneFor(admin, r.user_id), now)
  const { data, error } = await admin.rpc('award_monthly_dragon', { p_month: month })
  if (error) { console.error('dragon award failed:', error.message); return none }
  return { month, winners: ((data ?? []) as { winner: string }[]).map(r => r.winner) }
}

// The character each athlete shows on The Board and in leagues. Athletes with
// no guide, or with the character switched off, are left out.
export async function guideIcons(admin: SupabaseClient, ids: string[]): Promise<Map<string, GuideIcon>> {
  const out = new Map<string, GuideIcon>()
  if (!ids.length) return out
  const { data } = await admin.from('profiles').select('id, guide_character, guide_visible, guide_stage, best_streak').in('id', ids)
  for (const p of data ?? []) {
    if (isGuideKey(p.guide_character) && p.guide_visible !== false) out.set(p.id, { species: p.guide_character, stage: shownStage(p.best_streak, p.guide_stage) })
  }
  return out
}
