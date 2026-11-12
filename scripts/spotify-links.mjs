// Usage: SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... node scripts/spotify-links.mjs
// Looks up each song in lib/data/music.ts on Spotify and writes the exact
// track URL to its `spotify` field. Songs with no explicit-false match are left alone.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const file = fileURLToPath(new URL('../lib/data/music.ts', import.meta.url))
const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env
if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
  console.error('Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.')
  process.exit(1)
}

const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
  method: 'POST',
  headers: {
    Authorization: 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: 'grant_type=client_credentials',
})
if (!tokenRes.ok) {
  console.error(`Spotify token request failed: ${tokenRes.status}`)
  process.exit(1)
}
const { access_token } = await tokenRes.json()

const unescape = s => s.replace(/\\'/g, "'").replace(/\\\\/g, '\\')
const songLine = /\{ title: '((?:[^'\\]|\\.)*)', artist: '((?:[^'\\]|\\.)*)'/

async function findTrack(title, artist) {
  const q = `track:"${title}" artist:"${artist}"`
  const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=10`, {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  if (!res.ok) throw new Error(`Spotify search failed (${res.status}) for ${title}`)
  const { tracks } = await res.json()
  return tracks.items.find(t => t.explicit === false)?.id ?? null
}

const lines = readFileSync(file, 'utf8').split('\n')
const summary = { updated: 0, unchanged: 0, notFound: [] }

for (let i = 0; i < lines.length; i++) {
  const match = lines[i].match(songLine)
  if (!match) continue
  const title = unescape(match[1])
  const artist = unescape(match[2])
  const id = await findTrack(title, artist)
  if (!id) {
    summary.notFound.push(`${title} - ${artist}`)
    continue
  }
  const url = `https://open.spotify.com/track/${id}`
  const stripped = lines[i].replace(/,\s*spotify: '[^']*'(?=\s*\},)/, '')
  const next = stripped.replace(/\s*\},(\s*)$/, `, spotify: '${url}' },$1`)
  if (next === lines[i]) summary.unchanged++
  else { lines[i] = next; summary.updated++ }
}

writeFileSync(file, lines.join('\n'))
console.log(`Updated: ${summary.updated}`)
console.log(`Already current: ${summary.unchanged}`)
console.log(`No explicit-false match: ${summary.notFound.length}`)
for (const s of summary.notFound) console.log(`  - ${s}`)
