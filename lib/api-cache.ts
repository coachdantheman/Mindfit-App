// Show-last-then-refresh cache for GET /api calls, so a tab the athlete has
// already opened paints instantly and updates in the background.
// In memory only: gone on reload, cleared on sign-out and on any 401.

type Entry = { text: string; data: unknown }

const MAX_ENTRIES = 150
const cache = new Map<string, Entry>()

// "/api/nutrition/entries?days=30" -> "/api/nutrition"
export function sectionOf(url: string): string {
  const path = url.split('?')[0].replace(/^https?:\/\/[^/]+/, '')
  return path.split('/').slice(0, 3).join('/')
}

export function clearApiCache(section?: string) {
  if (!section) return cache.clear()
  for (const key of [...cache.keys()]) if (sectionOf(key) === section) cache.delete(key)
}

export function peek<T>(url: string): T | undefined {
  return cache.get(url)?.data as T | undefined
}

function store(url: string, entry: Entry) {
  cache.delete(url)
  cache.set(url, entry)
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string)
}

async function load(url: string): Promise<{ entry: Entry; changed: boolean }> {
  const before = cache.get(url)
  const res = await fetch(url)
  const text = await res.text()
  let data: unknown = null
  try { data = text ? JSON.parse(text) : null } catch { data = null }
  const entry = { text, data }
  if (res.status === 401) clearApiCache()
  else if (res.ok) store(url, entry)
  // A failed refresh keeps the last good answer on screen instead of
  // replacing it with an error body.
  if (!res.ok && before && res.status !== 401) return { entry: before, changed: false }
  return { entry, changed: !before || before.text !== text }
}

// Drop-in for `fetch(url).then(r => r.json()).then(onData)`. Calls onData
// right away with the last answer if there is one, then again with the fresh
// answer, unless nothing changed. Resolves with the fresh answer.
export async function cached<T>(url: string, onData: (data: T) => void): Promise<T> {
  const hit = cache.get(url)
  if (hit) onData(hit.data as T)
  const { entry, changed } = await load(url)
  if (changed) onData(entry.data as T)
  return entry.data as T
}

// Same idea for a page that needs several answers before it can paint.
// onData gets the answers in the order of the urls.
export async function cachedAll<T extends unknown[]>(urls: string[], onData: (data: T) => void): Promise<T> {
  const hits = urls.map(u => cache.get(u))
  const warm = hits.every(Boolean)
  if (warm) onData(hits.map(h => h!.data) as T)
  const loaded = await Promise.all(urls.map(load))
  const fresh = loaded.map(l => l.entry.data) as T
  if (!warm || loaded.some(l => l.changed)) onData(fresh)
  return fresh
}

// Any write to /api/<section>/... makes that section's cached answers
// wrong, so they are dropped and the next read loads fresh.
declare global {
  interface Window { __mfFetchPatched?: boolean }
}
if (typeof window !== 'undefined' && !window.__mfFetchPatched) {
  window.__mfFetchPatched = true
  const original = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    const res = await original(input, init)
    try {
      const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const path = url.replace(window.location.origin, '')
      if (method !== 'GET' && path.startsWith('/api/')) clearApiCache(sectionOf(path))
    } catch {}
    return res
  }
}
