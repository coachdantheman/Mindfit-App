import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { cronAuthorized } from '@/lib/cron-auth'
import { notify, DEFAULT_PREFS, type Prefs, type Message } from '@/lib/notify'
import { copy } from '@/lib/notify-copy'
import { scheduledKinds, localClock, shiftDate, inQuietHours } from '@/lib/notify-jobs'
import {
  scoreMonth, activityStreaks, levelFor, titleFor, monthBounds, isValidTimeZone, displayNameFor,
  type ActivityRow,
} from '@/lib/leaderboard'
import { LEVELS } from '@/lib/leaderboard-config'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Runs once per UTC hour (24 daily entries in vercel.json; Hobby crons
// fire anywhere inside their hour). Every send has a dedupe key, so an
// overlapping or repeated run never double-sends. ?dryRun=1 lists what
// would go out without sending.
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const dryRun = new URL(req.url).searchParams.get('dryRun') === '1'
  const admin = createAdminClient()
  const now = new Date()

  const [{ data: profiles }, { data: prefRows }] = await Promise.all([
    admin.from('profiles').select('id, full_name, role, birth_year, consent_status').in('role', ['member', 'coach', 'admin']),
    admin.from('notification_prefs').select('*'),
  ])
  const prefsById = new Map<string, Prefs>((prefRows ?? []).map((p: any) => [p.user_id, { ...DEFAULT_PREFS, ...p }]))
  const users = (profiles ?? []).filter(p => !(p.role === 'member' && (p.birth_year == null || p.consent_status === 'pending')))
  const prefsOf = (id: string) => prefsById.get(id) ?? DEFAULT_PREFS
  const tzOf = (id: string) => (isValidTimeZone(prefsOf(id).timezone) ? prefsOf(id).timezone : DEFAULT_PREFS.timezone)

  // Activity per timezone (the RPC buckets days in one timezone).
  const tzs = [...new Set(users.map(u => tzOf(u.id)))]
  const activity = new Map<string, { rows: ActivityRow[]; month: string; thisStart: string }>()
  for (const tz of tzs) {
    const b = monthBounds(now, tz)
    const { data } = await admin
      .rpc('get_leaderboard_activity', { p_start: shiftDate(b.lastStart, -30), p_end: b.thisEnd, p_tz: tz })
      .limit(20000)
    activity.set(tz, { rows: (data ?? []) as ActivityRow[], month: b.month, thisStart: b.thisStart })
  }

  const { data: snaps } = await admin.from('progress_snapshots').select('user_id, month, level, title')
  const snapOf = new Map((snaps ?? []).map((s: any) => [`${s.user_id}:${s.month}`, s]))

  const queue: { userId: string; msg: Message }[] = []
  const send = (userId: string, msg: Message) => queue.push({ userId, msg })
  const snapshotWrites: { user_id: string; month: string; level: string; title: string | null }[] = []

  // Team games tomorrow, per athlete.
  const tomorrows = [...new Set(users.map(u => shiftDate(localClock(tzOf(u.id), now).date, 1)))]
  const { data: games } = await admin.from('team_events').select('team_id, event_date, opponent').eq('kind', 'game').in('event_date', tomorrows)
  const gameTeams = [...new Set((games ?? []).map((g: any) => g.team_id))]
  const { data: gameMembers } = gameTeams.length
    ? await admin.from('team_members').select('team_id, athlete_id').in('team_id', gameTeams)
    : { data: [] as any[] }

  // Quiz taken 30 days ago.
  const { data: quizzes } = await admin.from('quiz_results').select('id, user_id, created_at')
    .gte('created_at', new Date(now.getTime() - 32 * 86_400_000).toISOString())
    .lte('created_at', new Date(now.getTime() - 29 * 86_400_000).toISOString())

  for (const u of users) {
    const tz = tzOf(u.id)
    const prefs = prefsOf(u.id)
    const clock = localClock(tz, now)
    const act = activity.get(tz)!
    const mine = act.rows.filter(r => r.user_id === u.id)
    const loggedToday = mine.some(r => r.day === clock.date)

    // Admins use the app as athletes too, so they get the same reminders.
    if (u.role === 'member' || u.role === 'admin') {
      const streak = activityStreaks(mine, clock.date).get(u.id) ?? 0
      const thisRows = mine.filter(r => r.day >= act.thisStart)
      const score = scoreMonth(thisRows, mine).get(u.id)
      const points = score?.total ?? 0

      for (const kind of scheduledKinds({ clock, reminderHour: prefs.reminder_hour, loggedToday, streak })) {
        const key = `${kind}:${u.id}:${clock.date}`
        if (kind === 'reminder') send(u.id, { type: kind, category: 'reminders', url: '/mindset', dedupeKey: key, ...copy.reminder() })
        if (kind === 'streak') send(u.id, { type: kind, category: 'reminders', url: '/mindset', dedupeKey: key, ...copy.streakRisk(streak) })
        if (kind === 'weekly_assessment') send(u.id, { type: kind, category: 'reminders', url: '/mindset', dedupeKey: key, ...copy.weeklyAssessment() })
        if (kind === 'month_start') send(u.id, { type: kind, category: 'progress', url: '/leaderboard', dedupeKey: key, ...copy.monthStart() })
        if (kind === 'weekly_recap') {
          const weekStart = shiftDate(clock.date, -6)
          const activeDays = new Set(mine.filter(r => r.day >= weekStart).map(r => r.day)).size
          send(u.id, { type: kind, category: 'weekly', url: '/leaderboard', dedupeKey: key, ...copy.weeklyRecap({ level: levelFor(points).name, points, streak, activeDays }) })
        }
      }

      // Level-ups and new titles. The first look at a month only records
      // the starting point, so turning this on never sends a backlog.
      if (!inQuietHours(clock.hour)) {
        const level = levelFor(points)
        const title = score ? titleFor(score.pillars, points) : null
        const snap = snapOf.get(`${u.id}:${act.month}`)
        if (!snap) {
          snapshotWrites.push({ user_id: u.id, month: act.month, level: level.key, title: title?.key ?? null })
        } else {
          const rank = (k: string) => LEVELS.findIndex(l => l.key === k)
          if (rank(level.key) > rank(snap.level)) {
            send(u.id, { type: 'level_up', category: 'progress', url: '/leaderboard', dedupeKey: `level:${u.id}:${act.month}:${level.key}`, ...copy.levelUp(level.name, points) })
          }
          if (title && title.key !== snap.title && points >= 100) {
            send(u.id, { type: 'new_title', category: 'progress', url: '/leaderboard', dedupeKey: `title:${u.id}:${act.month}:${title.key}`, ...copy.newTitle(title.name) })
          }
          if (rank(level.key) > rank(snap.level) || (title && title.key !== snap.title)) {
            snapshotWrites.push({ user_id: u.id, month: act.month, level: level.key, title: title?.key ?? null })
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
          const days = new Set(act.rows.filter(r => r.user_id === l.athlete_id && r.day >= weekStart).map(r => r.day)).size
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
    return NextResponse.json({ dryRun: true, users: users.length, queued: queue.length, byType, snapshots: snapshotWrites.length })
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
