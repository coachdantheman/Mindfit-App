// Optional 4th gratitude prompt, rotated by day of year. The 3 core prompts stay fixed.
export const ROTATING_PROMPTS = [
  'A teammate who made practice better today',
  'A coach who saw something in you',
  'A mistake that taught you something',
  'A rep you were proud of, even if no one saw it',
  'Someone at home who makes your sport possible',
  'A part of your game that is better than last month',
  'A moment you stayed calm when it got hard',
  'Something you can do now that you once could not',
  'A habit that is starting to feel like who you are',
  'A tough day that made you stronger',
  'Food or rest that helped you recover',
  'A small win nobody else noticed',
  'Someone you competed against who pushed you',
  'A place where you feel most like yourself',
  'A piece of advice that stuck with you',
  'A time you chose effort over comfort today',
  'Something about your body you trust',
  'A friend who reminds you who you are',
  'A moment of fun in your sport this week',
  'A goal you are closer to than you were',
  'A time you bounced back quickly',
  'Someone you helped get better',
  'A feeling of being locked in',
  'A lesson from a loss',
  'An opportunity you have that others do not',
  'Something in your routine that keeps you steady',
  'A person whose belief in you you can borrow today',
  'A sound, smell or sight from your sport you love',
  'A moment you acted like the athlete you want to be',
  'A reason you started playing in the first place',
]

export function rotatingPrompt(date: Date = new Date()): string {
  const start = new Date(date.getFullYear(), 0, 0)
  const day = Math.floor((date.getTime() - start.getTime()) / 86_400_000)
  return ROTATING_PROMPTS[day % ROTATING_PROMPTS.length]
}
