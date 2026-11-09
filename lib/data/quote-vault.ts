// Quote Vault: one card per person, rotating through their quotes.
// Separate from the daily quote in quotes.ts. Keys are stored in
// vault_prefs (fav_quote = quote id, pin_person = person key), so never
// rename a key or a quote id once shipped; add new ones at the end.

export type VaultGroup = 'Anime & Animation' | 'Film & TV' | 'Athletes' | 'Coaches & Teams'

export interface VaultPerson {
  key: string
  name: string
  source: string
  group: VaultGroup
  quotes: { id: string; text: string }[]
}

const p = (key: string, name: string, source: string, group: VaultGroup, quotes: string[]): VaultPerson => ({
  key, name, source, group,
  quotes: quotes.map((text, i) => ({ id: `${key}-${i + 1}`, text })),
})

export const VAULT: VaultPerson[] = [
  p('iroh', 'Uncle Iroh', 'Avatar: The Last Airbender', 'Anime & Animation', [
    'Pride is not the opposite of shame, but its source. True humility is the only antidote to shame.',
    'Sometimes life is like this dark tunnel. You can’t always see the light at the end of the tunnel, but if you just keep moving, you will come to a better place.',
    'It is important to draw wisdom from many different places. If you take it from only one place, it becomes rigid and stale.',
    'You must never give in to despair. Allow yourself to slip down that road, and you surrender to your lowest instincts.',
    'While it is always best to believe in oneself, a little help from others can be a great blessing.',
  ]),
  p('goku', 'Goku', 'Dragon Ball Z', 'Anime & Animation', [
    'Power comes in response to a need, not a desire.',
    'I am the hope of the universe. I am the answer to all living things that cry out for peace.',
  ]),
  p('vegeta', 'Vegeta', 'Dragon Ball Z', 'Anime & Animation', [
    'Push through the pain. Giving up hurts more.',
    'There’s no such thing as fair or unfair in battle. There is only victory or defeat.',
  ]),
  p('hiccup', 'Hiccup', 'How to Train Your Dragon', 'Anime & Animation', [
    'Most people would leave. Not us. We’re Vikings. We have stubbornness issues.',
    'I looked at him, and I saw myself.',
    'A chief protects his own.',
  ]),
  p('oogway', 'Master Oogway', 'Kung Fu Panda', 'Anime & Animation', [
    'Yesterday is history, tomorrow is a mystery, but today is a gift. That is why it is called the present.',
    'One often meets his destiny on the road he takes to avoid it.',
    'There are no accidents.',
  ]),
  p('naruto', 'Naruto Uzumaki', 'Naruto', 'Anime & Animation', [
    'I’m not gonna run away. I never go back on my word. That’s my nindo, my ninja way!',
  ]),
  p('rock-lee', 'Rock Lee', 'Naruto', 'Anime & Animation', [
    'A dropout will beat a genius through hard work.',
  ]),
  p('rocky', 'Rocky Balboa', 'Rocky Balboa', 'Film & TV', [
    'It ain’t about how hard you hit. It’s about how hard you can get hit and keep moving forward.',
    'Every champion was once a contender that refused to give up.',
  ]),
  p('yoda', 'Yoda', 'Star Wars', 'Film & TV', [
    'Do. Or do not. There is no try.',
    'You must unlearn what you have learned.',
  ]),
  p('ted-lasso', 'Ted Lasso', 'Ted Lasso', 'Film & TV', [
    'Be a goldfish.',
    'I believe in believe.',
    'Taking on a challenge is a lot like riding a horse. If you’re comfortable while you’re doing it, you’re probably doing it wrong.',
  ]),
  p('herb-brooks', 'Herb Brooks', 'Miracle', 'Film & TV', [
    'Great moments are born from great opportunity.',
    'You think you can win on talent alone? Gentlemen, you don’t have enough talent to win on talent alone.',
  ]),
  p('batman-begins', 'Thomas Wayne', 'Batman Begins', 'Film & TV', [
    'Why do we fall? So we can learn to pick ourselves up.',
  ]),
  p('goggins', 'David Goggins', 'Navy SEAL, ultra-endurance athlete', 'Athletes', [
    'You are in danger of living a life so comfortable and soft that you will die without ever realizing your true potential.',
    'When you think that you are done, you’re only at 40% of your body’s capability.',
    'Don’t stop when you’re tired. Stop when you’re done.',
    'The most important conversations you’ll ever have are the ones you’ll have with yourself.',
  ]),
  p('kobe', 'Kobe Bryant', 'NBA', 'Athletes', [
    'Everything negative, pressure, challenges, is all an opportunity for me to rise.',
    'Rest at the end, not in the middle.',
  ]),
  p('jordan', 'Michael Jordan', 'NBA', 'Athletes', [
    'I’ve failed over and over and over again in my life. And that is why I succeed.',
    'Talent wins games, but teamwork and intelligence win championships.',
    'Some people want it to happen, some wish it would happen, others make it happen.',
  ]),
  p('ali', 'Muhammad Ali', 'Boxing', 'Athletes', [
    'I hated every minute of training, but I said, “Don’t quit. Suffer now and live the rest of your life as a champion.”',
    'It’s the repetition of affirmations that leads to belief.',
    'Champions aren’t made in gyms. Champions are made from something they have deep inside them: a desire, a dream, a vision.',
  ]),
  p('serena', 'Serena Williams', 'Tennis', 'Athletes', [
    'I really think a champion is defined not by their wins but by how they can recover when they fall.',
  ]),
  p('biles', 'Simone Biles', 'Gymnastics', 'Athletes', [
    'I’m not the next Usain Bolt or Michael Phelps. I’m the first Simone Biles.',
  ]),
  p('kipchoge', 'Eliud Kipchoge', 'Marathon', 'Athletes', [
    'Only the disciplined ones in life are free.',
    'No human is limited.',
  ]),
  p('mia-hamm', 'Mia Hamm', 'Soccer', 'Athletes', [
    'Somewhere behind the athlete you’ve become and the hours of practice and the coaches who have pushed you is a little girl who fell in love with the game and never looked back. Play for her.',
  ]),
  p('prefontaine', 'Steve Prefontaine', 'Track', 'Athletes', [
    'To give anything less than your best is to sacrifice the gift.',
  ]),
  p('gretzky', 'Wayne Gretzky', 'NHL', 'Athletes', [
    'You miss 100% of the shots you don’t take.',
  ]),
  p('bruce-lee', 'Bruce Lee', 'Martial arts', 'Athletes', [
    'Do not pray for an easy life, pray for the strength to endure a difficult one.',
    'I fear not the man who has practiced 10,000 kicks once, but I fear the man who has practiced one kick 10,000 times.',
    'Be water, my friend.',
  ]),
  p('saban', 'Nick Saban', 'Alabama football', 'Coaches & Teams', [
    'Mediocre people don’t like high achievers, and high achievers don’t like mediocre people.',
    'Don’t look at the scoreboard. Focus on what you need to do on this play, in this moment. That’s the process.',
  ]),
  p('wooden', 'John Wooden', 'UCLA basketball', 'Coaches & Teams', [
    'Don’t let what you cannot do interfere with what you can do.',
    'Be quick, but don’t hurry.',
    'Success is peace of mind, which is a direct result of self-satisfaction in knowing you made the effort to become the best of which you are capable.',
  ]),
  p('lombardi', 'Vince Lombardi', 'Green Bay Packers', 'Coaches & Teams', [
    'Perfection is not attainable, but if we chase perfection we can catch excellence.',
  ]),
  p('phil-jackson', 'Phil Jackson', 'Bulls & Lakers', 'Coaches & Teams', [
    'The strength of the team is each individual member. The strength of each member is the team.',
  ]),
  p('all-blacks', 'New Zealand All Blacks', 'Rugby', 'Coaches & Teams', [
    'Better people make better All Blacks.',
    'Sweep the sheds. Never be too big to do the small things that need to be done.',
  ]),
  p('jim-rohn', 'Jim Rohn', 'Author and speaker', 'Coaches & Teams', [
    'We must all suffer one of two things: the pain of discipline or the pain of regret.',
  ]),
]

const DAY_MS = 86_400_000

// Each person's quote for a given local day. Stable for the whole day,
// moves to the next quote tomorrow.
export function vaultQuoteIndex(person: VaultPerson, dateKey: string): number {
  const days = Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / DAY_MS)
  return ((days % person.quotes.length) + person.quotes.length) % person.quotes.length
}
