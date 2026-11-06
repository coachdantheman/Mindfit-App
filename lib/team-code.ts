// A team code from a /join link waits here until the athlete is signed in.
const KEY = 'mf:team-code'

export function savePendingTeamCode(code: string) {
  try { localStorage.setItem(KEY, code) } catch {}
}

export function readPendingTeamCode(): string | null {
  try { return localStorage.getItem(KEY) } catch { return null }
}

export function clearPendingTeamCode() {
  try { localStorage.removeItem(KEY) } catch {}
}

export async function joinTeam(code: string): Promise<{ ok: true; teamName: string; already: boolean } | { ok: false; error: string }> {
  const res = await fetch('/api/teams/join', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, error: data.error || 'Could not join that team.' }
  return { ok: true, teamName: data.team.name, already: data.outcome === 'already' }
}
