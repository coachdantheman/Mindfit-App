import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { cronAuthorized } from '@/lib/cron-auth'
import { notify, DEFAULT_PREFS, type Prefs, type Message } from '@/lib/notify'
import { copy } from '@/lib/notify-copy'
import { scheduledKinds, localClock, shiftDate, inQuietHours } from '@/lib/notify-jobs'
import { levelFor, titleFor, monthBounds, isValidTimeZone, displayNameFor } from '@/lib/leaderboard'
import { refreshScore, liveStreak, pillarsOf, type ScoreRow } from '@/lib/leaderboard-scores'
import { LEVELS } from '@/lib/leaderboard-config'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const PAGE = 1000
const MAX_REFRESH_PER_RUN = 4000
// last_seen_at is only stamped every 10 minutes, so allow for that gap.
const SEEN_SLACK_MS = 15 * 60_000

// PostgREST returns at most 1000 rows per request; read every page.
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data } = await page(from, from + PAGE - 1)
    out.push(...(data ?? []))
    if (!data || data.length < PAGE) return out
  }
}

// Runs once per UTC hour (24 daily entries in vercel.json; Hobby crons
// fire anywhere inside their hour). Every send has a dedupe key, so an
// overlapping or repeated run never double-sends. ?dryRun=1 lists what
// would go out without sending.
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const dryRun = new URL(req.url).searchParams.get('dryRun') === '1'
  const admin = createAdminClient()
  const now = new Date()

  const [profiles, prefRows] = await Promise.all([
    fetchAll<{ id: string; full_name: string | null; role: string; birth_year: number | null; consent_status: string; last_seen_at: string | null }>((from, to) =>
      admin.from('profiles').select('id, full_name, role, birth_year, consent_status, last_seen_at').in('role', ['member', 'coach', 'admin']).order('id').range(from, to)),
    fetchAll<any>((from, to) => admin.from('notification_prefs').select('*').order('user_id').range(from, to)),
  ])
  const prefsById = new Map<string, Prefs>(prefRows.map((p: any) => [p.user_id, { ...DEFAULT_PREFS, ...p }]))
  const users = profiles.filter(p => !(p.role === 'member' && (p.birth_year == null || p.consent_status === 'pending')))
  const prefsOf = (id: string) => prefsById.get(id) ?? DEFAULT_PREFS
  const tzOf = (id: string) => (isValidTimeZone(prefsOf(id).timezone) ? prefsOf(id).timezone : DEFAULT_PREFS.timezone)

  // Stored month scores (leaderboard_scores). Anyone who used the app since
  // their score was last saved is refreshed first, one athlete at a time, so
  // reminders never go to someone who already logged today.
  const monthOf = (id: string) => monthBounds(now, tzOf(id)).month
  const months = [...new Set(users.map(u => monthOf(u.id)))]
  const scoreRows = months.length
    ? await fetchAll<ScoreRow>((from, to) =>
        admin.from('leaderboard_scores').select('*').in('month', months).order('user_id').order('month').range(from, to))
    : []
  const scoreOf = new Map<string, ScoreRow>(scoreRows.map(r => [`${r.user_id}:${r.month}`, r]))
  const recentCutoff = now.getTime() - 35 * 86_400_000
  const stale = users.filter(u => {
    if (!u.last_seen_at) return false
    const seen = new Date(u.last_seen_at).getTime()
    const row = scoreOf.get(`${u.id}:${monthOf(u.id)}`)
    return row?.updated_at ? seen > new Date(row.updated_at).getTime() - SEEN_SLACK_MS : seen > recentCutoff
  }).slice(0, MAX_REFRESH_PER_RUN)
  for (let i = 0; i < stale.length; i += 10) {
    const fresh = await Promise.all(stale.slice(i, i + 10).map(u => refreshScore(admin, u.id, tzOf(u.id), now).catch(() => null)))
    for (const row of fresh) if (row) scoreOf.set(`${row.user_id}:${row.month}`, { ...row, updated_at: now.toISOString() })
  }
  const rowOf = (id: string) => scoreOf.get(`${id}:${monthOf(id)}`) ?? null

  const snaps = months.length
    ? await fetchAll<any>((from, to) =>
        admin.from('progress_snapshots').select('user_id, month, level, title').in('month', months).order('user_id').order('month').range(from, to))
    : []
  const snapOf = new Map(snaps.map((s: any) => [`${s.user_id}:${s.month}`, s]))

  const queue: { userId: string; msg: Message }[] = []
  const send = (userId: string, msg: Message) => queue.push({ userId, msg })
  const snapshotWrites: { user_id: string; month: string; level: string; title: string | null }[] = []

  // Team games tomorrow, per athlete.
  const tomorrows = [...new Set(users.map(u => shiftDate(localClock(tzOf(u.id), now).date, 1)))]
  const { data: games } = await admin.from('team_events').select('team_id, event_date, opponent').eq('kind', 'game').in('event_date', tomorrows)
  const gameTeams = [...new Set((games ?? []).map((g: any) => g.team_id))]
  const gameMembers = gameTeams.length
    ? await fetchAll<any>((from, to) => admin.from('team_members').select('team_id, athlete_id').in('team_id', gameTeams).order('team_id').order('athlete_id').range(from, to))
    : []

  // Quiz taken 30 days ago.
  const { data: quizzes } = await admin.from('quiz_results').select('id, user_id, created_at')
    .gte('created_at', new Date(now.getTime() - 32 * 86_400_000).toISOString())
    .lte('created_at', new Date(now.getTime() - 29 * 86_400_000).toISOString())

  for (const u of users) {
    const tz = tzOf(u.id)
    const prefs = prefsOf(u.id)
    const clock = localClock(tz, now)
    const month = monthOf(u.id)
    const row = rowOf(u.id)
    const recent = row?.recent_days ?? []
    const loggedToday = recent.includes(clock.date)

    // Admins use the app as athletes too, so they get the same reminders.
    if (u.role === 'member' || u.role === 'admin') {
      const streak = liveStreak(row, clock.date)
      const points = row?.points ?? 0

      for (const kind of scheduledKinds({ clock, reminderHour: prefs.reminder_hour, loggedToday, streak })) {
        const key = `${kind}:${u.id}:${clock.date}`
        if (kind === 'reminder') send(u.id, { type: kind, category: 'reminders', url: '/mindset', dedupeKey: key, ...copy.reminder() })
        if (kind === 'streak') send(u.id, { type: kind, category: 'reminders', url: '/mindset', dedupeKey: key, ...copy.streakRisk(streak) })
        if (kind === 'weekly_assessment') send(u.id, { type: kind, category: 'reminders', url: '/mindset', dedupeKey: key, ...copy.weeklyAssessment() })
        if (kind === 'month_start') send(u.id, { type: kind, category: 'progress', url: '/leaderboard', dedupeKey: key, ...copy.monthStart() })
        if (kind === 'weekly_recap') {
          const weekStart = shiftDate(clock.date, -6)
          const activeDays = recent.filter(d => d >= weekStart && d <= clock.date).length
          send(u.id, { type: kind, category: 'weekly', url: '/leaderboard', dedupeKey: key, ...copy.weeklyRecap({ level: levelFor(points).name, points, streak, activeDays }) })
        }
      }

      // Level-ups and new titles. The first look at a month only records
      // the starting point, so turning this on never sends a backlog.
      if (!inQuietHours(clock.hour)) {
        const level = levelFor(points)
        const title = row && points > 0 ? titleFor(pillarsOf(row), points) : null
        const snap = snapOf.get(`${u.id}:${month}`)
        if (!snap) {
          snapshotWrites.push({ user_id: u.id, month, level: level.key, title: title?.key ?? null })
        } else {
          const rank = (k: string) => LEVELS.findIndex(l => l.key === k)
          if (rank(level.key) > rank(snap.level)) {
            send(u.id, { type: 'level_up', category: 'progress', url: '/leaderboard', dedupeKey: `level:${u.id}:${month}:${level.key}`, ...copy.levelUp(level.name, points) })
          }
          if (title && title.key !== snap.title && points >= 100) {
            send(u.id, { type: 'new_title', category: 'progress', url: '/leaderboard', dedupeKey: `title:${u.id}:${month}:${title.key}`, ...copy.newTitle(title.name) })
          }
          if (rank(level.key) > rank(snap.level) || (title && title.key !== snap.title)) {
            snapshotWrites.push({ user_id: u.id, month, level: level.key, title: title?.key ?? null })
          }
        }
      }

      if (clock.hour === prefs.reminder_hour) {
        const tomorrow = shiftDate(clock.date, 1)
        const myTeams = new Set((gameMembers ?? []).filter((m: any) => m.athlete_id === u.id).map((m: any) => m.team_id))
        const game = (games ?? []).find((g: any) => g.event_date === tomorrow && myTeams.has(g.team_id))
        if (game) send(u.id, { type: 'game_tomorrow', category: 'reminders', url: '/mindset', dedupeKey: `game:${u.id}:${tomorrow}`, ...copy.gameTomorrow(game.opponent) })

        const quiz = (quizzes ?? []).find((q: any) => q.user_id === u.id && localClock(tz, new Date(q.created_at)).date === shiftDate(clock.date, -30))
        if (quiz) send(u.id, { type: 'quiz_retake', category: 'reminders', url: '/learn', dedupeKey: `quiz:${u.id}:${quiz.id}`, ...copy.quizRetake() })
      }
    }

    // Coaches: Sunday 6 pm team digest.
    if (u.role === 'coach' && clock.weekday === 0 && clock.hour === 18) {
      const { data: links } = await admin.from('coach_athletes').select('athlete_id, profiles!coach_athletes_athlete_id_fkey(full_name)').eq('coach_id', u.id)
      if (links?.length) {
        const weekStart = shiftDate(clock.date, -6)
        const active: string[] = []
        const quiet: string[] = []
        for (const l of links as any[]) {
          const days = (rowOf(l.athlete_id)?.recent_days ?? []).filter(d => d >= weekStart && d <= clock.date).length
          const name = displayNameFor(l.profiles?.full_name ?? null)
          ;(days >= 3 ? active : quiet).push(name)
        }
        send(u.id, { type: 'coach_digest', category: 'weekly', url: '/coach', dedupeKey: `digest:${u.id}:${clock.date}`, ...copy.coachDigest({ active, quiet }) })
      }
    }
  }

  if (dryRun) {
    const byType: Record<string, number> = {}
    for (const q of queue) byType[q.msg.type] = (byType[q.msg.type] ?? 0) + 1
    return NextResponse.json({ dryRun: true, users: users.length, refreshed: stale.length, queued: queue.length, byType, snapshots: snapshotWrites.length })
  }

  if (snapshotWrites.length) await admin.from('progress_snapshots').upsert(snapshotWrites, { onConflict: 'user_id,month' })
  const results: Record<string, number> = {}
  for (let i = 0; i < queue.length; i += 10) {
    const batch = await Promise.all(queue.slice(i, i + 10).map(q => notify(admin, q.userId, q.msg).catch(() => 'skipped' as const)))
    for (const r of batch) results[r] = (results[r] ?? 0) + 1
  }
  await admin.from('notification_log').delete().lt('sent_at', new Date(now.getTime() - 120 * 86_400_000).toISOString())
  return NextResponse.json({ ok: true, users: users.length, queued: queue.length, results })
}
