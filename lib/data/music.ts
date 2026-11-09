// Music by moment, MindFit method: match the music to the arousal level
// the moment needs. Clean only. `clean: true` means the original is
// explicit, so links search for the clean / radio edit.

export type MusicMoment = 'hype' | 'focus' | 'reset' | 'grind' | 'recovery'

export interface Song { title: string; artist: string; clean?: boolean }

export const MOMENTS: { key: MusicMoment; name: string; when: string; why: string; songs: Song[] }[] = [
  {
    key: 'hype',
    name: 'Pre-game hype',
    when: 'Warm-up, the walk in, the locker room',
    why: 'Raise your energy and step into your competitor identity before the first whistle.',
    songs: [
      { title: 'Lose Yourself', artist: 'Eminem', clean: true },
      { title: 'Remember the Name', artist: 'Fort Minor', clean: true },
      { title: 'Can’t Hold Us', artist: 'Macklemore & Ryan Lewis', clean: true },
      { title: 'All I Do Is Win', artist: 'DJ Khaled', clean: true },
      { title: 'Eye of the Tiger', artist: 'Survivor' },
      { title: 'Thunderstruck', artist: 'AC/DC' },
      { title: 'Seven Nation Army', artist: 'The White Stripes' },
      { title: 'Jump Around', artist: 'House of Pain', clean: true },
      { title: 'Centuries', artist: 'Fall Out Boy' },
    ],
  },
  {
    key: 'focus',
    name: 'Locked-in focus',
    when: 'Final minutes before competing, visualization, film study',
    why: 'Narrow your attention to the next play. Instrumentals keep other people’s words out of your head.',
    songs: [
      { title: 'Time', artist: 'Hans Zimmer' },
      { title: 'Now We Are Free', artist: 'Hans Zimmer & Lisa Gerrard' },
      { title: 'Mountains', artist: 'Hans Zimmer' },
      { title: 'Duel of the Fates', artist: 'John Williams' },
      { title: 'Lux Aeterna', artist: 'Clint Mansell' },
      { title: 'He’s a Pirate', artist: 'Klaus Badelt' },
      { title: 'Not Afraid', artist: 'Eminem', clean: true },
      { title: 'Whatever It Takes', artist: 'Imagine Dragons' },
    ],
  },
  {
    key: 'reset',
    name: 'Calm & reset',
    when: 'After a mistake, between events, when nerves run hot',
    why: 'Bring your arousal back down to your zone so your skills can show up again.',
    songs: [
      { title: 'Weightless', artist: 'Marconi Union' },
      { title: 'Experience', artist: 'Ludovico Einaudi' },
      { title: 'River Flows in You', artist: 'Yiruma' },
      { title: 'Clair de Lune', artist: 'Claude Debussy' },
      { title: 'Holocene', artist: 'Bon Iver' },
      { title: 'Rise Up', artist: 'Andra Day' },
    ],
  },
  {
    key: 'grind',
    name: 'Training grind',
    when: 'Lifts, conditioning, the reps nobody sees',
    why: 'Steady drive for long sessions. Who you are in practice is who shows up in the game.',
    songs: [
      { title: 'Till I Collapse', artist: 'Eminem', clean: true },
      { title: 'Gonna Fly Now', artist: 'Bill Conti' },
      { title: 'Believer', artist: 'Imagine Dragons' },
      { title: 'Warriors', artist: 'Imagine Dragons' },
      { title: 'Hall of Fame', artist: 'The Script ft. will.i.am' },
      { title: 'Stronger (What Doesn’t Kill You)', artist: 'Kelly Clarkson' },
      { title: 'Champion', artist: 'Carrie Underwood ft. Ludacris' },
      { title: 'Unstoppable', artist: 'The Score' },
      { title: 'Legend', artist: 'The Score' },
      { title: 'Started From the Bottom', artist: 'Drake', clean: true },
    ],
  },
  {
    key: 'recovery',
    name: 'Recovery',
    when: 'Ride home, stretching, the night after competition',
    why: 'Let your body come down, reflect on what went well, and refuel for the next one.',
    songs: [
      { title: 'Three Little Birds', artist: 'Bob Marley & The Wailers' },
      { title: 'Here Comes the Sun', artist: 'The Beatles' },
      { title: 'Lovely Day', artist: 'Bill Withers' },
      { title: 'Good Life', artist: 'OneRepublic' },
      { title: 'Better Days', artist: 'OneRepublic' },
      { title: 'The Nights', artist: 'Avicii' },
      { title: 'Unwritten', artist: 'Natasha Bedingfield' },
      { title: 'Fix You', artist: 'Coldplay' },
    ],
  },
]

const query = (s: Song) => `${s.title} ${s.artist}${s.clean ? ' clean' : ''}`

export const spotifyUrl = (s: Song) => `https://open.spotify.com/search/${encodeURIComponent(query(s))}`
export const appleMusicUrl = (s: Song) => `https://music.apple.com/us/search?term=${encodeURIComponent(query(s))}`
