// Small built-in filter for names (leaderboard aliases, team names).
// Whole-word match after leetspeak folding; the worst slurs are also checked
// with all non-letters removed so "n-i-g-g-e-r" style spacing is caught.
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '@': 'a', '$': 's' }

const PROFANITY = [
  'fuck', 'fucker', 'fucking', 'fucked', 'motherfucker', 'shit', 'shitty', 'bullshit', 'shithead',
  'bitch', 'bitches', 'bitchy', 'ass', 'asshole', 'assholes', 'dumbass', 'jackass', 'bastard',
  'dick', 'dickhead', 'cock', 'cocksucker', 'pussy', 'cunt', 'whore', 'slut', 'twat', 'wanker',
  'prick', 'piss', 'pissed', 'cum', 'porn', 'porno', 'penis', 'vagina', 'boob', 'boobs', 'damn', 'goddamn',
]

const WORST_SLURS = [
  'nigger', 'nigga', 'faggot', 'retard', 'kike', 'chink', 'tranny', 'wetback', 'dyke', 'gook',
]

const WORDS = new Set([...PROFANITY, ...WORST_SLURS])

export function hasProfanity(text: string): boolean {
  const folded = text.toLowerCase().replace(/[01345@$]/g, c => LEET[c])
  const words = folded.replace(/[^a-z]+/g, ' ').split(' ').filter(Boolean)
  if (words.some(w => WORDS.has(w))) return true
  const squashed = folded.replace(/[^a-z]/g, '')
  return WORST_SLURS.some(s => squashed.includes(s))
}
