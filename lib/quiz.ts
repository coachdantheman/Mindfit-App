import { LessonSection } from '@/types'

export type Need = 'confidence' | 'focus' | 'pressure' | 'motivation' | 'recovery'

// Also the tie-break order: earlier wins.
export const NEEDS: Need[] = ['pressure', 'confidence', 'focus', 'motivation', 'recovery']

export const NEED_LABELS: Record<Need, string> = {
  confidence: 'Confidence',
  focus: 'Focus',
  pressure: 'Pressure & Nerves',
  motivation: 'Motivation & Resilience',
  recovery: 'Recovery & Routine',
}

export interface QuizQuestion { id: string; text: string; need: Need }

export const QUESTIONS: QuizQuestion[] = [
  { id: 'q1', need: 'confidence', text: "After a mistake, I start doubting whether I'm good enough." },
  { id: 'q2', need: 'confidence', text: 'My confidence depends on how my last game or practice went.' },
  { id: 'q3', need: 'focus', text: 'During games my mind drifts to the crowd, the score, or what others think.' },
  { id: 'q4', need: 'focus', text: "I'm still replaying a mistake when the next play has already started." },
  { id: 'q5', need: 'pressure', text: 'Before big games, nerves make my body feel tight or shaky.' },
  { id: 'q6', need: 'pressure', text: 'I play my best in practice but not when it matters most.' },
  { id: 'q7', need: 'motivation', text: 'When training gets hard or boring, I struggle to push through.' },
  { id: 'q8', need: 'motivation', text: 'A bad stretch or a setback makes me want to check out or quit.' },
  { id: 'q9', need: 'recovery', text: "I don't have a set routine before games or practices." },
  { id: 'q10', need: 'recovery', text: 'I go to bed at different times and often wake up tired.' },
]

// Shown interleaved so the same need never comes twice in a row.
export const QUESTION_ORDER = ['q1', 'q3', 'q5', 'q7', 'q9', 'q2', 'q4', 'q6', 'q8', 'q10']
  .map(id => QUESTIONS.find(q => q.id === id)!)

export const SCALE = ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] as const
export const MAX_ANSWER = SCALE.length - 1
export const LOW_THRESHOLD = 2

export type QuizAnswers = Record<string, number>
export type NeedScores = Record<Need, number>

export interface QuizScore { scores: NeedScores; top_need: Need; low: boolean }

export function validateAnswers(input: unknown): QuizAnswers | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const raw = input as Record<string, unknown>
  if (Object.keys(raw).length !== QUESTIONS.length) return null
  const answers: QuizAnswers = {}
  for (const q of QUESTIONS) {
    const v = raw[q.id]
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > MAX_ANSWER) return null
    answers[q.id] = v
  }
  return answers
}

export function scoreQuiz(answers: QuizAnswers): QuizScore {
  const scores = { confidence: 0, focus: 0, pressure: 0, motivation: 0, recovery: 0 } as NeedScores
  for (const q of QUESTIONS) scores[q.need] += answers[q.id] ?? 0
  let top_need = NEEDS[0]
  for (const n of NEEDS) if (scores[n] > scores[top_need]) top_need = n
  return { scores, top_need, low: NEEDS.every(n => scores[n] <= LOW_THRESHOLD) }
}

export interface QuizAction { label: string; href: string; section: LessonSection }

const A = {
  affirmations: { label: 'Affirmations', href: '/mindset?tab=Affirmations', section: 'affirmations' },
  journal: { label: 'Journal', href: '/mindset?tab=Journal', section: 'journal' },
  visualization: { label: 'Visualization', href: '/mindset?tab=Visualization', section: 'visualization' },
  habits: { label: 'Habits', href: '/mindset?tab=Habits', section: 'goals' },
  flow: { label: 'Flow State', href: '/mindset?tab=Flow%20State', section: 'flow_state' },
  goals: { label: 'Goals', href: '/mindset?tab=Goals', section: 'goals' },
  gratitude: { label: 'Gratitude', href: '/mindset?tab=Gratitude', section: 'gratitude' },
  sleep: { label: 'Sleep', href: '/sleep', section: 'sleep' },
  weekly: { label: 'MPI Weekly Assessment', href: '/mindset?tab=MPI%20Weekly%20Assessment', section: 'weekly_assessment' },
} satisfies Record<string, QuizAction>

export const RESULTS: Record<Need, { paragraph: string; actions: QuizAction[] }> = {
  confidence: {
    paragraph: "Your confidence is riding on results. When it rises and falls with your last game, every mistake feels like a verdict on who you are. Confident athletes don't wait for proof before they act like themselves. They decide who they are first and let performance follow. Your work is to build an identity that holds steady after a bad rep: name the athlete you are, collect daily evidence for it, and rehearse it until it feels normal.",
    actions: [A.affirmations, A.journal, A.visualization],
  },
  focus: {
    paragraph: "Your attention is leaking. The crowd, the scoreboard and the last mistake each pull you out of the play in front of you. Focus is a skill you can train, and it's where flow starts. Athletes who find flow see themselves as present competitors who live in this play and nothing else. Your work is to train the reset: one breath, one cue word, back to now.",
    actions: [A.visualization, A.flow, A.journal],
  },
  pressure: {
    paragraph: "You're not short on talent. Pressure is getting between your training and your game. Nerves are energy, your body getting ready to compete. The trouble starts when you read that energy as a threat. Athletes who rise in big moments see themselves as people who belong there. Your work is to rehearse the moment before it arrives, so game day feels familiar instead of foreign.",
    actions: [A.visualization, A.flow, A.affirmations],
  },
  motivation: {
    paragraph: "Your drive fades when the work gets hard or the results don't come. That's normal, and you can fix it. Motivation that depends on how you feel won't last a season. Resilient athletes act from who they are: \"I'm someone who shows up,\" not \"I'll show up if I feel like it.\" Your work is to tie your daily habits to that identity and treat setbacks as part of the story, not the end of it.",
    actions: [A.goals, A.journal, A.gratitude],
  },
  recovery: {
    paragraph: "Your mind and body aren't getting the consistency they need. Without a routine, every game day starts from zero. Short or uneven sleep drains focus, mood and reaction time before you step on the field. Elite athletes treat recovery as part of training, not a break from it. Your work is to build a pre-game routine and protect a sleep window, so your best self shows up on schedule.",
    actions: [A.sleep, A.habits, A.visualization],
  },
}

export const LOW_NOTE = "Your answers are low across the board. That's a strong foundation. Here's the area to sharpen first."
