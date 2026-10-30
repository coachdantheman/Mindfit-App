// The athlete list a coach/admin was browsing, so the detail page can offer
// Prev / Next. Per tab; cleared when the tab closes.
const KEY = 'mf_roster'

export function saveRoster(base: string, ids: string[]) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ base, ids })) } catch {}
}

export function readRoster(base: string, athleteId: string): { base: string; ids: string[] } | null {
  try {
    const r = JSON.parse(sessionStorage.getItem(KEY) ?? 'null')
    if (r && r.base === base && Array.isArray(r.ids) && r.ids.includes(athleteId)) return r
  } catch {}
  return null
}
