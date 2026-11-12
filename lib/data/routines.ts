// Guided morning and night routines on the Mindset tab. Each step is a short
// rep; `href` opens the part of the app that does it, `seconds` runs a timer.
export interface RoutineStep { id: string; title: string; detail: string; href?: string; seconds?: number }
export interface Routine { key: 'morning' | 'night'; name: string; promise: string; steps: RoutineStep[] }

export const ROUTINES: Routine[] = [
  {
    key: 'morning',
    name: 'Morning routine',
    promise: 'Five minutes to decide who shows up today.',
    steps: [
      { id: 'water', title: 'Drink a glass of water', detail: 'You wake up dehydrated. Water first, phone second.' },
      { id: 'identity', title: 'Say your identity statement', detail: 'Read your "I am" statement out loud, like you mean it.', href: '/mindset?tab=Affirmations' },
      { id: 'breathe', title: 'Five slow breaths', detail: '4 seconds in, 6 seconds out. Settle before the day starts.', seconds: 50 },
      { id: 'see', title: 'See your day go right', detail: 'Close your eyes for 60 seconds. Picture practice, class and the moment that matters.', seconds: 60 },
      { id: 'objective', title: 'Set one objective', detail: 'One thing that makes today a win. Write it in your journal.', href: '/mindset?tab=Journal' },
    ],
  },
  {
    key: 'night',
    name: 'Night routine',
    promise: 'Close the day so your mind can recover.',
    steps: [
      { id: 'grateful', title: 'Three things you are grateful for', detail: 'Small counts. Gratitude lowers stress before sleep.', href: '/mindset?tab=Gratitude' },
      { id: 'review', title: 'Rate your day', detail: 'Finish your journal: what went well, what you will do better.', href: '/mindset?tab=Journal' },
      { id: 'tomorrow', title: 'Plan tomorrow\'s one thing', detail: 'Decide it now so you wake up with direction.' },
      { id: 'screens', title: 'Screens away', detail: 'Phone on the charger, out of reach, 30 minutes before sleep.' },
      { id: 'breathe', title: 'Slow your breathing', detail: '4 seconds in, 6 seconds out until the timer ends.', seconds: 90 },
    ],
  },
]

/** Morning until 2 pm, night after. */
export const routineFor = (hour: number): Routine['key'] => (hour < 14 ? 'morning' : 'night')
