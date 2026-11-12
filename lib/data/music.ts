// Music by moment, MindFit method: match the music to the arousal level
// the moment needs. Clean only. `clean: true` means the original is
// explicit, so links search for the clean / radio edit.

export type MusicMoment = 'hype' | 'focus' | 'reset' | 'grind' | 'recovery'

// `apple` is the exact track (clean version where one exists), looked up once
// from the iTunes Search API on 2026-11-11.
// `spotify` is the exact track, filled in by scripts/spotify-links.mjs.
export interface Song { title: string; artist: string; clean?: boolean; apple?: string; spotify?: string }

export const MOMENTS: { key: MusicMoment; name: string; when: string; why: string; songs: Song[] }[] = [
  {
    key: 'hype',
    name: 'Pre-game hype',
    when: 'Warm-up, the walk in, the locker room',
    why: 'Raise your energy and step into your competitor identity before the first whistle.',
    songs: [
      { title: 'Lose Yourself', artist: 'Eminem', clean: true, apple: 'https://music.apple.com/us/album/lose-yourself/1440903339?i=1440903439' },
      { title: 'Remember the Name', artist: 'Fort Minor', clean: true, apple: 'https://music.apple.com/us/album/remember-the-name-feat-styles-of-beyond/1345120956?i=1345120958' },
      { title: 'Can’t Hold Us', artist: 'Macklemore & Ryan Lewis', clean: true, apple: 'https://music.apple.com/us/album/cant-hold-us-feat-ray-dalton/560148910?i=560148920' },
      { title: 'All I Do Is Win', artist: 'DJ Khaled', clean: true, apple: 'https://music.apple.com/us/album/all-i-do-is-win-feat-t-pain-ludacris-snoop-dogg-rick-ross/353859956?i=353859978' },
      { title: 'Eye of the Tiger', artist: 'Survivor', apple: 'https://music.apple.com/us/album/eye-of-the-tiger/254685010?i=254685026' },
      { title: 'Thunderstruck', artist: 'AC/DC', apple: 'https://music.apple.com/us/album/thunderstruck/575998519?i=575998661' },
      { title: 'Seven Nation Army', artist: 'The White Stripes', apple: 'https://music.apple.com/us/album/seven-nation-army/1533513536?i=1533513537' },
      { title: 'Jump Around', artist: 'House of Pain', clean: true, apple: 'https://music.apple.com/us/album/jump-around/1440897311?i=1440898063' },
      { title: 'Centuries', artist: 'Fall Out Boy', apple: 'https://music.apple.com/us/album/centuries/1440826504?i=1440826614' },
    ],
  },
  {
    key: 'focus',
    name: 'Locked-in focus',
    when: 'Final minutes before competing, visualization, film study',
    why: 'Narrow your attention to the next play. Instrumentals keep other people’s words out of your head.',
    songs: [
      { title: 'Time', artist: 'Hans Zimmer', apple: 'https://music.apple.com/us/album/time/380349905?i=380350246' },
      { title: 'Now We Are Free', artist: 'Hans Zimmer & Lisa Gerrard', apple: 'https://music.apple.com/us/album/now-we-are-free/1440563157?i=1440563274' },
      { title: 'Mountains', artist: 'Hans Zimmer', apple: 'https://music.apple.com/us/album/mountains/1533983552?i=1533984703' },
      { title: 'Duel of the Fates', artist: 'John Williams', apple: 'https://music.apple.com/us/album/duel-of-the-fates/1375813540?i=1375814326' },
      { title: 'Lux Aeterna', artist: 'Clint Mansell', apple: 'https://music.apple.com/us/album/lux-aeterna/41228773?i=41228839' },
      { title: 'He’s a Pirate', artist: 'Klaus Badelt', apple: 'https://music.apple.com/us/album/hes-a-pirate/1440649561?i=1440650203' },
      { title: 'Not Afraid', artist: 'Eminem', clean: true, apple: 'https://music.apple.com/us/album/not-afraid/1440781199?i=1440781847' },
      { title: 'Whatever It Takes', artist: 'Imagine Dragons', apple: 'https://music.apple.com/us/album/whatever-it-takes/1411625594?i=1411628148' },
    ],
  },
  {
    key: 'reset',
    name: 'Calm & reset',
    when: 'After a mistake, between events, when nerves run hot',
    why: 'Bring your arousal back down to your zone so your skills can show up again.',
    songs: [
      { title: 'Weightless', artist: 'Marconi Union', apple: 'https://music.apple.com/us/album/weightless/571977211?i=571977598' },
      { title: 'Experience', artist: 'Ludovico Einaudi', apple: 'https://music.apple.com/us/album/experience/1696816863?i=1696817959' },
      { title: 'River Flows in You', artist: 'Yiruma', apple: 'https://music.apple.com/us/album/river-flows-in-you/1436677753?i=1436677761' },
      { title: 'Clair de Lune', artist: 'Claude Debussy', apple: 'https://music.apple.com/us/album/clair-de-lune/1465829316?i=1465829317' },
      { title: 'Holocene', artist: 'Bon Iver', apple: 'https://music.apple.com/us/album/holocene/438685974?i=438685989' },
      { title: 'Rise Up', artist: 'Andra Day', apple: 'https://music.apple.com/us/album/rise-up/996787628?i=996788062' },
    ],
  },
  {
    key: 'grind',
    name: 'Training grind',
    when: 'Lifts, conditioning, the reps nobody sees',
    why: 'Steady drive for long sessions. Who you are in practice is who shows up in the game.',
    songs: [
      { title: 'Till I Collapse', artist: 'Eminem', clean: true, apple: 'https://music.apple.com/us/album/till-i-collapse-feat-nate-dogg/1440821542?i=1440821843' },
      { title: 'Gonna Fly Now', artist: 'Bill Conti', apple: 'https://music.apple.com/us/album/gonna-fly-now-theme-from-rocky/1440832384?i=1440832696' },
      { title: 'Believer', artist: 'Imagine Dragons', apple: 'https://music.apple.com/us/album/believer/1411625594?i=1411628233' },
      { title: 'Warriors', artist: 'Imagine Dragons', apple: 'https://music.apple.com/us/album/warriors/1440831203?i=1440831624' },
      { title: 'Hall of Fame', artist: 'The Script ft. will.i.am', apple: 'https://music.apple.com/us/album/hall-of-fame-feat-will-i-am/1006956655?i=1006957115' },
      { title: 'Stronger (What Doesn’t Kill You)', artist: 'Kelly Clarkson', apple: 'https://music.apple.com/us/album/stronger-what-doesnt-kill-you/464532842?i=464532969' },
      { title: 'Champion', artist: 'Carrie Underwood ft. Ludacris', apple: 'https://music.apple.com/us/album/the-champion-feat-ludacris-bonus-track/1432044881?i=1432046868' },
      { title: 'Unstoppable', artist: 'The Score', apple: 'https://music.apple.com/us/album/unstoppable/1440901314?i=1440901324' },
      { title: 'Legend', artist: 'The Score', apple: 'https://music.apple.com/us/album/legend/1440901314?i=1440901318' },
      { title: 'Started From the Bottom', artist: 'Drake', clean: true, apple: 'https://music.apple.com/us/album/started-from-the-bottom/1440819797?i=1440820222' },
    ],
  },
  {
    key: 'recovery',
    name: 'Recovery',
    when: 'Ride home, stretching, the night after competition',
    why: 'Let your body come down, reflect on what went well, and refuel for the next one.',
    songs: [
      { title: 'Three Little Birds', artist: 'Bob Marley & The Wailers', apple: 'https://music.apple.com/us/album/three-little-birds/1496696597?i=1496696606' },
      { title: 'Here Comes the Sun', artist: 'The Beatles', apple: 'https://music.apple.com/us/album/here-comes-the-sun/1441164426?i=1441164589' },
      { title: 'Lovely Day', artist: 'Bill Withers', apple: 'https://music.apple.com/us/album/lovely-day/391725408?i=391725492' },
      { title: 'Good Life', artist: 'OneRepublic', apple: 'https://music.apple.com/us/album/good-life/1461280395?i=1461280616' },
      { title: 'Better Days', artist: 'OneRepublic', apple: 'https://music.apple.com/us/album/better-days/1502298673?i=1502298689' },
      { title: 'The Nights', artist: 'Avicii', apple: 'https://music.apple.com/us/album/the-nights/1440829274?i=1440829549' },
      { title: 'Unwritten', artist: 'Natasha Bedingfield', apple: 'https://music.apple.com/us/album/unwritten/430514888?i=430514893' },
      { title: 'Fix You', artist: 'Coldplay', apple: 'https://music.apple.com/us/album/fix-you/1123076757?i=1123076826' },
    ],
  },
]

const query = (s: Song) => `${s.title} ${s.artist}${s.clean ? ' clean' : ''}`

// Exact track when scripts/spotify-links.mjs has filled `spotify`, otherwise opens the track search.
export const spotifyUrl = (s: Song) => s.spotify ?? `https://open.spotify.com/search/${encodeURIComponent(query(s))}/tracks`
export const appleMusicUrl = (s: Song) => s.apple ?? `https://music.apple.com/us/search?term=${encodeURIComponent(query(s))}`
