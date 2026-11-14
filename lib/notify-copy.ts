import { escapeHtml } from '@/lib/email'

// Every notification and email the app sends. Voice: calm, credible,
// identity first ("who you're becoming"), never hype.

const p = (text: string) => `<p style="color:#d1d5db;font-size:15px;line-height:1.6;margin:0 0 16px;">${text}</p>`
const h = (text: string) => `<h2 style="color:#f3f4f6;font-size:20px;font-weight:600;margin:0 0 16px;">${text}</h2>`

export const copy = {
  reminder: () => ({
    title: "Today's rep is still open",
    body: 'Log one thing: journal, workout, meal or sleep. The athlete you are becoming shows up on ordinary days too.',
  }),
  streakRisk: (streak: number) => ({
    title: `${streak}-day streak on the line`,
    body: 'One log before midnight keeps it growing. Consistency is part of who you are now.',
  }),
  levelUp: (level: string, points: number) => ({
    title: `You reached ${level}`,
    body: `${points} points this month. That is evidence of who you are becoming. Keep stacking days.`,
    email: {
      subject: `You just reached ${level} on The Board`,
      html: h(`You reached ${escapeHtml(level)}`) +
        p(`${points} points this month. Every one of them came from a day you chose to show up.`) +
        p('Levels are not about the number. They are proof that you train your mind like you train your body. Keep stacking days.'),
    },
  }),
  dragon: () => ({
    title: 'You earned the Dragon',
    body: 'You finished last month as the #1 athlete on The Board. Your new guide is waiting.',
  }),
  newTitle: (title: string) => ({
    title: `New title: ${title}`,
    body: 'Your training this month earned it. Wear it.',
  }),
  pr: (prs: number, tierUps: number) => ({
    title: prs > 1 ? `${prs} new PRs` : prs === 1 ? 'New PR' : 'Strength tier up',
    body: tierUps > 0 && prs > 0
      ? 'New PRs and a tier up. Progress you can measure. Recover well and come back stronger.'
      : 'Progress you can measure. Recover well and come back stronger.',
  }),
  planAssigned: (coach: string, plan: string) => ({
    title: 'New plan from your coach',
    body: `${coach} assigned "${plan}". It is ready in Exercise.`,
    email: {
      subject: `${coach} assigned you a new training plan`,
      html: h('You have a new plan') + p(`${escapeHtml(coach)} assigned <strong>${escapeHtml(plan)}</strong>. Open Exercise to see your first session.`),
    },
  }),
  teamJoin: (athlete: string, team: string) => ({
    title: `${athlete} joined ${team}`,
    body: 'They can now see the team schedule, and you can follow their progress.',
  }),
  coachRequest: (coach: string) => ({
    title: `${coach} wants to connect`,
    body: 'Accept or decline in the app. Nothing is shared until you say yes.',
    email: {
      subject: `${coach} wants to connect with you on MindFit`,
      html: h(`${escapeHtml(coach)} wants to connect`) +
        p('If you accept, your coach will see your journal, check-ins, workouts, nutrition and sleep, so they can help you grow. Nothing is shared until you say yes, and you can remove a coach anytime in Settings.'),
    },
  }),
  coachNote: (coach: string) => ({
    title: `New note from ${coach}`,
    body: 'Your coach left feedback on your Flow State work.',
  }),
  gameTomorrow: (opponent: string | null) => ({
    title: 'Game day tomorrow',
    body: `${opponent ? `vs ${opponent}. ` : ''}Run your pre-game routine tonight and sleep like it matters. It does.`,
  }),
  weeklyAssessment: () => ({
    title: 'Weekly check-in',
    body: 'Two minutes to rate your week. It is how you see your mental game move.',
  }),
  weeklyRecap: (r: { level: string; points: number; streak: number; activeDays: number }) => ({
    title: 'Your week on MindFit',
    body: `${r.activeDays} of 7 days active · ${r.points} points · ${r.level}`,
    email: {
      subject: `Your week: ${r.activeDays}/7 days, ${r.level}`,
      html: h('Your week on MindFit') +
        p(`<strong>${r.activeDays} of 7 days</strong> active this week. <strong>${r.points}</strong> points this month, level <strong>${escapeHtml(r.level)}</strong>${r.streak >= 2 ? `, on a <strong>${r.streak}-day</strong> streak` : ''}.`) +
        p(r.activeDays >= 5
          ? 'That is what consistent athletes look like. Protect the routine next week.'
          : 'Pick the two days you will not miss next week, and win those first.'),
    },
  }),
  coachDigest: (team: { active: string[]; quiet: string[] }) => ({
    title: 'Your team this week',
    body: `${team.active.length} active, ${team.quiet.length} quiet this week.`,
    email: {
      subject: `Your team this week: ${team.active.length} active, ${team.quiet.length} quiet`,
      html: h('Your team this week') +
        p(`<strong>${team.active.length}</strong> athletes logged at least 3 days this week.`) +
        (team.quiet.length
          ? p(`Quiet this week: ${team.quiet.map(escapeHtml).join(', ')}. A quick word from you goes a long way. Use "Send encouragement" in the app.`)
          : p('Nobody went quiet. Tell them you noticed.')),
    },
  }),
  monthStart: () => ({
    title: 'New month. New board.',
    body: 'Clean slate on The Board. Set the tone this week.',
  }),
  habitCheckIn: (left: number, total: number) => ({
    title: 'End of day check-in',
    body: left === total
      ? `${total} habit${total === 1 ? '' : 's'} to check off today. Close the day like the athlete you are building.`
      : `${left} of ${total} habits left today. Finish strong and check them off.`,
  }),
  leagueFinal: (r: { zone: 'up' | 'down' | null; rank: number; league: string }) => {
    const spots = r.rank - 5
    const body = r.zone === 'up'
      ? `Final hours. You're #${r.rank} in the ${r.league}. Hold the top 5 to move up.`
      : r.zone === null && r.rank >= 6 && r.rank <= 8
        ? `Final hours. You're #${r.rank} in the ${r.league}, ${spots} ${spots === 1 ? 'spot' : 'spots'} from moving up. One more log could do it.`
        : r.zone === 'down'
          ? `Final hours. You're in the bottom 5 of the ${r.league}. Log today to stay up.`
          : `Final hours in the ${r.league}. You're #${r.rank}. Every point counts before midnight.`
    return { title: 'Final hours', body }
  },
  quizRetake: () => ({
    title: 'Retake the Athlete Quiz',
    body: 'It has been 30 days. See what changed, and what you need most now.',
  }),
}

// Coaches pick a theme; each athlete gets a different line from it, and the
// line rotates daily, so a team never sees the same message twice in a row.
export const ENCOURAGEMENT = {
  proud: 'Proud of your work',
  keep_going: 'Keep going',
  big_game: 'Big game ahead',
  check_in: 'Checking in',
} as const
export const ENCOURAGEMENT_VARIANTS: Record<keyof typeof ENCOURAGEMENT, string[]> = {
  proud: [
    'Proud of the work you are putting in. Keep showing up.',
    'I see the reps you are stacking. That is who you are becoming.',
    'The way you have been showing up lately is the standard. Keep it.',
    'Your consistency is noticed. Champions are built on days like these.',
    'You are doing the work nobody sees. It will show up when it counts.',
    'That effort is your identity now. Proud of you.',
    'You keep raising your standard. Keep owning it.',
  ],
  keep_going: [
    'Consistency wins. Get one rep in today.',
    'One small win today. That is all it takes to keep the streak alive.',
    'Momentum is built one day at a time. Log today and keep it rolling.',
    'You do not need a perfect day. You need a day where you show up.',
    'Great athletes are not motivated every day. They are consistent every day.',
    'Stack another day. Future you is counting on it.',
    'Keep the chain going. One check-in, one rep, one win.',
  ],
  big_game: [
    'Trust your preparation. You are ready.',
    'You have done the work. Now let it come.',
    'Run your routine, lock in your cue word, and play free.',
    'Pressure is a privilege. You earned this moment.',
    'Be the athlete you have trained to be. Nothing more, nothing less.',
    'Breathe, anchor, compete. You belong out there.',
    'Big moments are built for prepared people. That is you.',
  ],
  check_in: [
    'Have not seen you log in a bit. Everything good? Jump back in today.',
    'Missing you on the board. One quick check-in gets you back on track.',
    'Life gets busy. Two minutes in the app today keeps your mind sharp.',
    'Checking in on you. How are you feeling? Log today and let me know.',
    'No judgment, just a reminder: today is a great day to restart.',
    'Your team is still grinding. Come back and join them today.',
  ],
}

// Deterministic per athlete per day, so team sends spread across the lines.
export function encouragementLine(key: keyof typeof ENCOURAGEMENT, athleteId: string, day: string): string {
  const lines = ENCOURAGEMENT_VARIANTS[key]
  let h = 0
  for (const ch of athleteId + day) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return lines[h % lines.length]
}
export type EncouragementKey = keyof typeof ENCOURAGEMENT
