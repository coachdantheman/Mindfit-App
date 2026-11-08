import type { SupabaseClient } from '@supabase/supabase-js'
import { randomInt } from 'crypto'
import { consentFlags } from '@/lib/consent-flags'

// No 0/O or 1/I so codes read cleanly off a whiteboard.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateJoinCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)]
  return code
}

export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return /^[A-Z0-9]{6}$/.test(code) ? code : null
}

export interface TeamRow { id: string; coach_id: string; name: string; sport: string | null; join_code: string; created_at: string }

export const TEAM_COLS = 'id, coach_id, name, sport, join_code, created_at'

// The team, if this user coaches it (admins manage every team).
export async function managedTeam(admin: SupabaseClient, user: { userId: string; role: string }, teamId: string): Promise<TeamRow | null> {
  const { data } = await admin.from('teams').select(TEAM_COLS).eq('id', teamId).maybeSingle()
  if (!data) return null
  return user.role === 'admin' || data.coach_id === user.userId ? data as TeamRow : null
}

// Joining a team also links the athlete to its coach, so the coach roster,
// athlete detail and coach RLS policies all see them.
export async function addToTeam(admin: SupabaseClient, team: Pick<TeamRow, 'id' | 'coach_id'>, athleteId: string): Promise<'joined' | 'already' | 'blocked'> {
  if ((await consentFlags(admin, athleteId)).coachesBlocked) return 'blocked'
  const { error } = await admin.from('team_members').insert({ team_id: team.id, athlete_id: athleteId })
  if (error && error.code !== '23505') throw error
  if (team.coach_id !== athleteId) {
    const { error: linkErr } = await admin.from('coach_athletes').insert({ coach_id: team.coach_id, athlete_id: athleteId })
    if (linkErr && linkErr.code !== '23505') throw linkErr
  }
  return error ? 'already' : 'joined'
}

// Leaving a team ends the coach's access unless the athlete is still on
// another team with the same coach.
export async function removeFromTeam(admin: SupabaseClient, team: Pick<TeamRow, 'id' | 'coach_id'>, athleteId: string): Promise<void> {
  await admin.from('team_members').delete().eq('team_id', team.id).eq('athlete_id', athleteId)
  const { data: otherTeams } = await admin.from('teams').select('id').eq('coach_id', team.coach_id).neq('id', team.id)
  const otherIds = (otherTeams ?? []).map(t => t.id)
  if (otherIds.length) {
    const { count } = await admin.from('team_members').select('team_id', { count: 'exact', head: true })
      .eq('athlete_id', athleteId).in('team_id', otherIds)
    if ((count ?? 0) > 0) return
  }
  await admin.from('coach_athletes').delete().eq('coach_id', team.coach_id).eq('athlete_id', athleteId)
}

export async function createTeam(admin: SupabaseClient, coachId: string, name: string, sport: string | null): Promise<TeamRow> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await admin.from('teams')
      .insert({ coach_id: coachId, name, sport, join_code: generateJoinCode() })
      .select(TEAM_COLS).single()
    if (!error && data) return data as TeamRow
    if (error?.code !== '23505') throw error
  }
  throw new Error('Could not create a unique team code. Try again.')
}

export async function newJoinCode(admin: SupabaseClient, teamId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateJoinCode()
    const { error } = await admin.from('teams').update({ join_code: code }).eq('id', teamId)
    if (!error) return code
    if (error.code !== '23505') throw error
  }
  throw new Error('Could not create a unique team code. Try again.')
}

// Turns a coach's picks (whole teams and/or single athletes) into the
// athlete ids they're allowed to assign to: members of teams they manage
// plus athletes on their own roster. Admins can assign anyone.
export async function resolveAssignees(
  admin: SupabaseClient,
  user: { userId: string; role: string },
  teamIds: unknown,
  athleteIds: unknown,
): Promise<string[]> {
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 200) : [])
  const teams = ids(teamIds)
  const picked = ids(athleteIds)
  const out = new Set<string>()

  if (teams.length) {
    let q = admin.from('teams').select('id').in('id', teams)
    if (user.role !== 'admin') q = q.eq('coach_id', user.userId)
    const { data: ok } = await q
    const okIds = (ok ?? []).map(t => t.id)
    if (okIds.length) {
      const { data: members } = await admin.from('team_members').select('athlete_id').in('team_id', okIds)
      for (const m of members ?? []) out.add(m.athlete_id)
    }
  }
  if (picked.length) {
    if (user.role === 'admin') picked.forEach(id => out.add(id))
    else {
      const { data: roster } = await admin.from('coach_athletes').select('athlete_id').eq('coach_id', user.userId).in('athlete_id', picked)
      for (const r of roster ?? []) out.add(r.athlete_id)
    }
  }
  out.delete(user.userId)
  return [...out]
}
