import type { Need } from '@/lib/quiz'

export interface PlanDay { day: number; title: string; task: string; href: string; cta: string }

// 7-day starter plan per quiz result. One small rep a day, each linked to the
// part of the app that trains it.
export const STARTER_PLANS: Record<Need, { headline: string; days: PlanDay[] }> = {
  confidence: {
    headline: 'Confidence is built from evidence. This week you collect it.',
    days: [
      { day: 1, title: 'Write who you are', task: 'Write one identity statement that starts with "I am".', href: '/mindset?tab=Affirmations', cta: 'Open Affirmations' },
      { day: 2, title: 'Log your wins', task: "In tonight's journal, name three things you did well today.", href: '/mindset?tab=Journal', cta: 'Open Journal' },
      { day: 3, title: 'See it first', task: 'Do a 5-minute visualization of your best performance.', href: '/mindset?tab=Visualization', cta: 'Open Visualization' },
      { day: 4, title: 'Stack the proof', task: 'Read back your wins from Day 2 and add two more.', href: '/mindset?tab=Journal', cta: 'Open Journal' },
      { day: 5, title: 'Own your body language', task: 'Pick one posture cue for practice: chin up, shoulders back, eyes forward.', href: '/mindset?tab=Habits', cta: 'Add it as a habit' },
      { day: 6, title: 'Run the Flow Stack', task: 'Do the full pre-game Flow Stack once, even on a practice day.', href: '/mindset?tab=Flow%20State', cta: 'Open Flow Stack' },
      { day: 7, title: 'Check your number', task: 'Take the weekly MPI assessment and compare it to your baseline.', href: '/mindset?tab=MPI%20Weekly%20Assessment', cta: 'Take the assessment' },
    ],
  },
  focus: {
    headline: 'Focus is a skill. This week you train where your attention goes.',
    days: [
      { day: 1, title: 'Pick your cue word', task: 'Choose one cue word that pulls you back to the present.', href: '/mindset?tab=Flow%20State', cta: 'Open Flow State' },
      { day: 2, title: 'One objective', task: 'Set one clear objective for today in your journal. Only one.', href: '/mindset?tab=Journal', cta: 'Open Journal' },
      { day: 3, title: 'Breathe to reset', task: 'Take five slow breaths: 4 seconds in, 6 seconds out. Notice your attention settle.', href: '/mindset?tab=Flow%20State', cta: 'Open Flow State' },
      { day: 4, title: 'Rehearse the moment', task: 'Visualize one game moment where you usually drift. See yourself stay locked in.', href: '/mindset?tab=Visualization', cta: 'Open Visualization' },
      { day: 5, title: 'Protect your attention', task: 'Phone away for the first 30 minutes after you wake up.', href: '/mindset?tab=Habits', cta: 'Add it as a habit' },
      { day: 6, title: 'Next play', task: 'After every mistake in practice, say your cue word and move on.', href: '/mindset?tab=Journal', cta: 'Log how it went' },
      { day: 7, title: 'Check your number', task: 'Take the weekly MPI assessment and look at your focus score.', href: '/mindset?tab=MPI%20Weekly%20Assessment', cta: 'Take the assessment' },
    ],
  },
  pressure: {
    headline: 'Pressure is a privilege. This week you practice performing under it.',
    days: [
      { day: 1, title: 'Name the nerves', task: 'Write what pressure feels like in your body. Naming it lowers its grip.', href: '/mindset?tab=Journal', cta: 'Open Journal' },
      { day: 2, title: 'Reframe it', task: 'Say it out loud: "This is excitement. My body is getting ready."', href: '/mindset?tab=Affirmations', cta: 'Save it as an affirmation' },
      { day: 3, title: 'Breathe it down', task: 'Practice 4 in, 6 out for two minutes. This is your reset under pressure.', href: '/mindset?tab=Flow%20State', cta: 'Open Flow State' },
      { day: 4, title: 'Rehearse the big moment', task: 'Visualize the highest-pressure moment of your sport going right.', href: '/mindset?tab=Visualization', cta: 'Open Visualization' },
      { day: 5, title: 'Build your routine', task: 'Set up your pre-game routine on Game Day so nothing is left to chance.', href: '/exercise?tab=gameday', cta: 'Open Game Day' },
      { day: 6, title: 'Run the Flow Stack', task: 'Do the full Flow Stack before practice and treat it like a game.', href: '/mindset?tab=Flow%20State', cta: 'Open Flow Stack' },
      { day: 7, title: 'Check your number', task: 'Take the weekly MPI assessment and look at anxiety management.', href: '/mindset?tab=MPI%20Weekly%20Assessment', cta: 'Take the assessment' },
    ],
  },
  motivation: {
    headline: 'Motivation follows action. This week you build the reps first.',
    days: [
      { day: 1, title: 'Find your why', task: 'Write one goal and the reason it matters to you.', href: '/mindset?tab=Goals', cta: 'Open Goals' },
      { day: 2, title: 'Make it small', task: 'Add one 2-minute daily habit that moves that goal.', href: '/mindset?tab=Habits', cta: 'Open Habits' },
      { day: 3, title: 'Start the streak', task: 'Log anything today. Day one of a streak is the hardest.', href: '/leaderboard', cta: 'See the Board' },
      { day: 4, title: 'Thank the work', task: 'Write three things you are grateful for in your sport.', href: '/mindset?tab=Gratitude', cta: 'Open Gratitude' },
      { day: 5, title: 'See the finish', task: 'Visualize the day you hit your goal. What does it feel like?', href: '/mindset?tab=Visualization', cta: 'Open Visualization' },
      { day: 6, title: 'Move your goal', task: 'Update your goal progress. Even 5% counts.', href: '/mindset?tab=Goals', cta: 'Open Goals' },
      { day: 7, title: 'Check your number', task: 'Take the weekly MPI assessment and look at motivation.', href: '/mindset?tab=MPI%20Weekly%20Assessment', cta: 'Take the assessment' },
    ],
  },
  recovery: {
    headline: 'Recovery is training. This week you treat rest like a rep.',
    days: [
      { day: 1, title: 'Log last night', task: 'Log your sleep. You cannot fix what you do not measure.', href: '/sleep', cta: 'Open Sleep' },
      { day: 2, title: 'Set a bedtime', task: 'Pick a bedtime that gives you 8 to 10 hours, and start the wind-down 30 minutes before.', href: '/sleep', cta: 'Open Sleep' },
      { day: 3, title: 'Close the day', task: "Write tonight's journal so your mind does not carry the day to bed.", href: '/mindset?tab=Journal', cta: 'Open Journal' },
      { day: 4, title: 'Check in with your body', task: 'Do a recovery check-in: soreness, energy, mood.', href: '/sleep', cta: 'Open Recovery' },
      { day: 5, title: 'Fuel the repair', task: 'Log your meals today and hit your protein goal.', href: '/nutrition', cta: 'Open Nutrition' },
      { day: 6, title: 'Screens off', task: 'No phone for the last 30 minutes before bed.', href: '/mindset?tab=Habits', cta: 'Add it as a habit' },
      { day: 7, title: 'Check your number', task: 'Take the weekly MPI assessment and compare how you feel to Day 1.', href: '/mindset?tab=MPI%20Weekly%20Assessment', cta: 'Take the assessment' },
    ],
  },
}
