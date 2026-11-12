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
  // The original voices. Always listed first.
  featured: boolean
  quotes: { id: string; text: string }[]
}

const person = (featured: boolean) => (key: string, name: string, source: string, group: VaultGroup, quotes: string[]): VaultPerson => ({
  key, name, source, group, featured,
  quotes: quotes.map((text, i) => ({ id: `${key}-${i + 1}`, text })),
})
const p = person(true)
const n = person(false)

export const VAULT: VaultPerson[] = [
  p('iroh', 'Uncle Iroh', 'Avatar: The Last Airbender', 'Anime & Animation', [
    'Pride is not the opposite of shame, but its source. True humility is the only antidote to shame.',
    'Sometimes life is like this dark tunnel. You can’t always see the light at the end of the tunnel, but if you just keep moving, you will come to a better place.',
    'It is important to draw wisdom from many different places. If you take it from only one place, it becomes rigid and stale.',
    'You must never give in to despair. Allow yourself to slip down that road, and you surrender to your lowest instincts.',
    'While it is always best to believe in oneself, a little help from others can be a great blessing.',
    'You are stronger and wiser and freer than you have ever been. And now you have come to the crossroads of your destiny. It’s time for you to choose.',
    'Life happens wherever you are, whether you make it or not.',
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
    'You are too concerned with what was and what will be.',
    'Your mind is like this water, my friend. When it is agitated, it becomes difficult to see. But if you allow it to settle, the answer becomes clear.',
    'You must believe.',
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
    'The world ain’t all sunshine and rainbows.',
    'You, me, or nobody is gonna hit as hard as life.',
  ]),
  p('yoda', 'Yoda', 'Star Wars', 'Film & TV', [
    'Do. Or do not. There is no try.',
    'You must unlearn what you have learned.',
    'The greatest teacher, failure is.',
    'Fear is the path to the dark side.',
    'Pass on what you have learned.',
  ]),
  p('ted-lasso', 'Ted Lasso', 'Ted Lasso', 'Film & TV', [
    'Be a goldfish.',
    'I believe in believe.',
    'Taking on a challenge is a lot like riding a horse. If you’re comfortable while you’re doing it, you’re probably doing it wrong.',
    'Doing the right thing is never the wrong thing.',
    'Be curious, not judgmental.',
    'It’s the lack of hope that comes and gets you.',
  ]),
  p('herb-brooks', 'Herb Brooks', 'Miracle', 'Film & TV', [
    'Great moments are born from great opportunity.',
    'You think you can win on talent alone? Gentlemen, you don’t have enough talent to win on talent alone.',
    'This is your time.',
    'The legs feed the wolf.',
  ]),
  p('batman-begins', 'Thomas Wayne', 'Batman Begins', 'Film & TV', [
    'Why do we fall? So we can learn to pick ourselves up.',
  ]),
  p('goggins', 'David Goggins', 'Navy SEAL, ultra-endurance athlete', 'Athletes', [
    'You are in danger of living a life so comfortable and soft that you will die without ever realizing your true potential.',
    'When you think that you are done, you’re only at 40% of your body’s capability.',
    'Don’t stop when you’re tired. Stop when you’re done.',
    'The most important conversations you’ll ever have are the ones you’ll have with yourself.',
    'I just wanted to be uncommon amongst uncommon men.',
  ]),
  p('kobe', 'Kobe Bryant', 'NBA', 'Athletes', [
    'Everything negative, pressure, challenges, is all an opportunity for me to rise.',
    'Rest at the end, not in the middle.',
  ]),
  p('jordan', 'Michael Jordan', 'NBA', 'Athletes', [
    'I’ve failed over and over and over again in my life. And that is why I succeed.',
    'Talent wins games, but teamwork and intelligence win championships.',
    'Some people want it to happen, some wish it would happen, others make it happen.',
    'I can accept failure, everyone fails at something. But I can’t accept not trying.',
  ]),
  p('ali', 'Muhammad Ali', 'Boxing', 'Athletes', [
    'I hated every minute of training, but I said, “Don’t quit. Suffer now and live the rest of your life as a champion.”',
    'It’s the repetition of affirmations that leads to belief.',
    'Champions aren’t made in gyms. Champions are made from something they have deep inside them: a desire, a dream, a vision.',
    'He who is not courageous enough to take risks will accomplish nothing in life.',
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
    'Absorb what is useful, discard what is useless and add what is specifically your own.',
    'There are no limits. There are plateaus, but you must not stay there, you must go beyond them.',
  ]),
  p('saban', 'Nick Saban', 'Alabama football', 'Coaches & Teams', [
    'Mediocre people don’t like high achievers, and high achievers don’t like mediocre people.',
    'Don’t look at the scoreboard. Focus on what you need to do on this play, in this moment. That’s the process.',
  ]),
  p('wooden', 'John Wooden', 'UCLA basketball', 'Coaches & Teams', [
    'Don’t let what you cannot do interfere with what you can do.',
    'Be quick, but don’t hurry.',
    'Success is peace of mind, which is a direct result of self-satisfaction in knowing you made the effort to become the best of which you are capable.',
    'Make each day your masterpiece.',
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
    'Champions do extra.',
    'Leave the jersey in a better place.',
  ]),
  p('jim-rohn', 'Jim Rohn', 'Author and speaker', 'Coaches & Teams', [
    'We must all suffer one of two things: the pain of discipline or the pain of regret.',
    'Success is nothing more than a few simple disciplines, practiced every day.',
  ]),
  // Added Nov 2026. Not featured: shown after the originals, in a daily shuffle.
  n('lebron', 'LeBron James', 'NBA', 'Athletes', [
    'Nothing is given. Everything is earned.',
  ]),
  n('giannis', 'Giannis Antetokounmpo', 'NBA', 'Athletes', [
    'It’s not a failure. It’s steps to success.',
    'There’s no failure in sports. There’s good days, bad days. Some days you are able to be successful, some days you’re not.',
  ]),
  n('jeter', 'Derek Jeter', 'MLB', 'Athletes', [
    'There may be people who have more talent than you do, but there’s no excuse for anyone to work harder than you do.',
  ]),
  n('billie-jean-king', 'Billie Jean King', 'Tennis', 'Athletes', [
    'Pressure is a privilege.',
  ]),
  n('jackie-robinson', 'Jackie Robinson', 'MLB', 'Athletes', [
    'A life is not important except in the impact it has on other lives.',
  ]),
  n('federer', 'Roger Federer', 'Tennis', 'Athletes', [
    'Effortless is a myth.',
    'It’s only a point.',
    'Negative energy is wasted energy.',
  ]),
  n('ashe', 'Arthur Ashe', 'Tennis', 'Athletes', [
    'Success is a journey, not a destination. The doing is often more important than the outcome.',
  ]),
  n('gable', 'Dan Gable', 'Wrestling', 'Athletes', [
    'Once you’ve wrestled, everything else in life is easy.',
  ]),
  n('babe-ruth', 'Babe Ruth', 'MLB', 'Athletes', [
    'It’s hard to beat a person who never gives up.',
  ]),
  n('summitt', 'Pat Summitt', 'Tennessee basketball', 'Coaches & Teams', [
    'Discipline yourself so no one else has to.',
    'Left foot, right foot, breathe.',
  ]),
  n('coach-k', 'Mike Krzyzewski', 'Duke basketball', 'Coaches & Teams', [
    'Next play.',
  ]),
  n('belichick', 'Bill Belichick', 'New England Patriots', 'Coaches & Teams', [
    'Do your job.',
  ]),
  n('bill-walsh', 'Bill Walsh', 'San Francisco 49ers', 'Coaches & Teams', [
    'The score takes care of itself.',
  ]),
  n('valvano', 'Jim Valvano', 'NC State basketball', 'Coaches & Teams', [
    'Don’t give up. Don’t ever give up.',
  ]),
  n('coach-taylor', 'Coach Eric Taylor', 'Friday Night Lights', 'Film & TV', [
    'Clear eyes, full hearts, can’t lose.',
  ]),
  n('miyagi', 'Mr. Miyagi', 'The Karate Kid', 'Film & TV', [
    'First learn stand, then learn fly. Nature’s rule, Daniel-san, not mine.',
    'Lesson not just karate only. Lesson for whole life. Whole life have a balance. Everything be better.',
  ]),
  n('gandalf', 'Gandalf', 'The Lord of the Rings', 'Film & TV', [
    'All we have to decide is what to do with the time that is given us.',
  ]),
  n('dumbledore', 'Albus Dumbledore', 'Harry Potter', 'Film & TV', [
    'It is our choices, Harry, that show what we truly are, far more than our abilities.',
  ]),
  n('sandlot-babe', 'The Babe', 'The Sandlot', 'Film & TV', [
    'Heroes get remembered, but legends never die. Follow your heart, kid, and you’ll never go wrong.',
  ]),
  n('creed', 'Rocky Balboa to Adonis', 'Creed', 'Film & TV', [
    'One step at a time. One punch at a time. One round at a time.',
  ]),
  n('captain-america', 'Captain America', 'Marvel', 'Film & TV', [
    'I can do this all day.',
  ]),
  n('tchalla', 'T’Challa', 'Black Panther', 'Film & TV', [
    'In times of crisis, the wise build bridges, while the foolish build barriers.',
  ]),
  n('rafiki', 'Rafiki', 'The Lion King', 'Anime & Animation', [
    'Oh yes, the past can hurt. But the way I see it, you can either run from it or learn from it.',
  ]),
  n('mufasa', 'Mufasa', 'The Lion King', 'Anime & Animation', [
    'Remember who you are.',
  ]),
  n('dory', 'Dory', 'Finding Nemo', 'Anime & Animation', [
    'Just keep swimming.',
  ]),
  n('mulan-emperor', 'The Emperor', 'Mulan', 'Anime & Animation', [
    'The flower that blooms in adversity is the most rare and beautiful of all.',
  ]),
  n('shifu', 'Master Shifu', 'Kung Fu Panda', 'Anime & Animation', [
    'If you only do what you can do, you’ll never be more than you are now.',
  ]),
  n('miles-morales', 'Miles Morales', 'Spider-Man: Into the Spider-Verse', 'Anime & Animation', [
    'Anyone can wear the mask.',
  ]),
  n('all-might', 'All Might', 'My Hero Academia', 'Anime & Animation', [
    'It’s all right now. Why? Because I am here!',
    'Go beyond! Plus Ultra!',
  ]),
  n('kakashi', 'Kakashi Hatake', 'Naruto', 'Anime & Animation', [
    'Those who break the rules are scum, but those who abandon their friends are worse than scum.',
  ]),
  n('rengoku', 'Kyojuro Rengoku', 'Demon Slayer', 'Anime & Animation', [
    'Set your heart ablaze.',
  ]),
]

const DAY_MS = 86_400_000

// Each person's quote for a given local day. Stable for the whole day,
// moves to the next quote tomorrow.
export function vaultQuoteIndex(person: VaultPerson, dateKey: string): number {
  const days = Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / DAY_MS)
  return ((days % person.quotes.length) + person.quotes.length) % person.quotes.length
}

// Everyone rotates: the order changes each day, so different voices surface
// first. Pinned people are moved to the top by the caller.
export function vaultOrder(people: VaultPerson[], dateKey: string): VaultPerson[] {
  const rank = (k: string) => {
    let h = 2166136261
    for (const c of k + dateKey) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
    return h >>> 0
  }
  return [...people].sort((a, b) => rank(a.key) - rank(b.key))
}
