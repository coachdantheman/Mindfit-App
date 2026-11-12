'use client'
import CollapsibleList from '@/components/shared/CollapsibleList'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import RatingSlider from '@/components/journal/RatingSlider'
import SaveButton, { type SaveState } from '@/components/shared/SaveButton'
import Skeleton from '@/components/shared/Skeleton'
import { TRIGGERS } from '@/components/mindset/flow/flow-constants'
import { flowZone, ZONE_COLOR } from '@/components/mindset/flow-logic'
import { clearDraft, draftKey, readDraft, writeDraft } from '@/lib/useDraft'
import { localDateISO } from '@/lib/dates'
import type { FlowTrigger } from '@/types'
import { loadMySchedule } from '@/lib/team-schedule'
import { cached } from '@/lib/api-cache'

type Kind = 'practice' | 'game'
type Result = '' | 'win' | 'loss' | 'tie'

interface Form {
  sport: string
  completed: boolean
  trained: string
  learned: string
  difficulty: number
  objectiveMet: boolean
  opponent: string
  result: Result
  score: string
  playingTime: string
  performance: number
  wentWell: string
  toImprove: string
  flowOn: boolean
  skill: number
  flow: number
  triggers: FlowTrigger[]
}

interface Entry {
  id: string
  log_date: string
  kind: Kind
  sport: string | null
  completed: boolean
  trained: string | null
  learned: string | null
  difficulty: number | null
  objective_met: boolean | null
  flow_log_id: string | null
  opponent: string | null
  result: Exclude<Result, ''> | null
  score: string | null
  performance: number | null
  went_well: string | null
  to_improve: string | null
  playing_time_min: number | null
  flow_score?: number | null
}

interface FlowRow { id: string; skill_level: number; flow_score: number; triggers_fired: FlowTrigger[] }

interface Props {
  notify: (msg: string, kind?: 'success' | 'error') => void
  fixedKind?: Kind
}

const EMPTY: Form = {
  sport: '', completed: true, trained: '', learned: '', difficulty: 6, objectiveMet: false,
  opponent: '', result: '', score: '', playingTime: '', performance: 6, wentWell: '', toImprove: '',
  flowOn: false, skill: 6, flow: 6, triggers: [],
}

const RESULT_LABEL: Record<Exclude<Result, ''>, string> = { win: 'Win', loss: 'Loss', tie: 'Tie' }

function fromEntry(e: Entry, flow: FlowRow | undefined, sport: string): Form {
  return {
    sport: e.sport ?? sport,
    completed: e.completed,
    trained: e.trained ?? '',
    learned: e.learned ?? '',
    difficulty: e.difficulty ?? 6,
    objectiveMet: e.objective_met === true,
    opponent: e.opponent ?? '',
    result: e.result ?? '',
    score: e.score ?? '',
    playingTime: e.playing_time_min != null ? String(e.playing_time_min) : '',
    performance: e.performance ?? 6,
    wentWell: e.went_well ?? '',
    toImprove: e.to_improve ?? '',
    flowOn: !!flow,
    skill: flow ? Math.round(Number(flow.skill_level)) : 6,
    flow: flow ? flow.flow_score : 6,
    triggers: flow?.triggers_fired ?? [],
  }
}

// Exercise → Practice. One practice and one game per day; the difficulty
// score doubles as the flow challenge level when the flow thread is on.
export default function PracticeLog({ notify, fixedKind }: Props) {
  const today = localDateISO()
  const [kind, setKind] = useState<Kind>(fixedKind ?? 'practice')
  const [forms, setForms] = useState<Record<Kind, Form>>({ practice: EMPTY, game: EMPTY })
  const [saved, setSaved] = useState<Record<Kind, boolean>>({ practice: false, game: false })
  const [state, setState] = useState<SaveState>('idle')
  const [loading, setLoading] = useState(true)
  const [objective, setObjective] = useState<string | null>(null)
  const [sports, setSports] = useState<string[]>([])
  const [recent, setRecent] = useState<Entry[]>([])
  // Set when the athlete arrives from a finished pre-game 5-A Stack.
  const [stackSession, setStackSession] = useState<string | null>(null)
  const form = forms[kind]
  const key = draftKey(`practice-log:${kind}`)

  const fetchRecent = useCallback(() => {
    fetch('/api/exercise/practice?days=14')
      .then(r => (r.ok ? r.json() : []))
      .then(d => { if (Array.isArray(d)) setRecent(d) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let defaultSport = ''
    Promise.all([
      fetch('/api/profile').then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/exercise/practice?date=${today}`).then(r => (r.ok ? r.json() : null)).catch(() => null),
      loadMySchedule(),
    ]).then(([profile, day, schedule]) => {
      const list = [profile?.primary_sport, profile?.secondary_sport].filter((s): s is string => !!s)
      setSports(list)
      defaultSport = list[0] ?? ''
      const teamGame = schedule.find(e => e.kind === 'game' && e.event_date === today)
      const session = new URLSearchParams(window.location.search).get('session')
      if (session) setStackSession(session)
      if (!fixedKind && (session || teamGame || profile?.next_competition_at?.slice(0, 10) === today)) setKind('game')

      const entries: Entry[] = day?.entries ?? []
      const flows: FlowRow[] = day?.flows ?? []
      setObjective(day?.journal?.objective ?? null)

      const next: Record<Kind, Form> = { practice: EMPTY, game: EMPTY }
      const nextSaved: Record<Kind, boolean> = { practice: false, game: false }
      for (const k of ['practice', 'game'] as Kind[]) {
        const e = entries.find(x => x.kind === k)
        if (e) {
          next[k] = fromEntry(e, flows.find(f => f.id === e.flow_log_id), defaultSport)
          nextSaved[k] = true
        } else {
          const draft = readDraft<Form>(draftKey(`practice-log:${k}`))
          next[k] = draft ? { ...EMPTY, ...draft } : { ...EMPTY, sport: defaultSport, opponent: k === 'game' ? teamGame?.opponent ?? '' : '' }
        }
      }
      if (session) next.game = { ...next.game, flowOn: true }
      setForms(next)
      setSaved(nextSaved)
      setLoading(false)
    })
    cached('/api/exercise/practice?days=14', (d: Entry[]) => { if (Array.isArray(d)) setRecent(d) }).catch(() => {})
  }, [today, fixedKind])

  useEffect(() => {
    if (loading || saved[kind]) return
    writeDraft<Form>(key, form)
  }, [form, loading, saved, kind, key])

  const update = (patch: Partial<Form>) => {
    setForms(prev => ({ ...prev, [kind]: { ...prev[kind], ...patch } }))
    setSaved(prev => (prev[kind] ? { ...prev, [kind]: false } : prev))
    if (state !== 'saving') setState('idle')
  }
  const toggleTrigger = (t: FlowTrigger) =>
    update({ triggers: form.triggers.includes(t) ? form.triggers.filter(x => x !== t) : [...form.triggers, t] })

  const save = async () => {
    if (state === 'saving') return
    const isGame = kind === 'game'
    setState('saving')
    try {
      const res = await fetch('/api/exercise/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_date: today,
          kind,
          sport: form.sport || null,
          completed: form.completed,
          trained: form.trained || null,
          learned: form.learned || null,
          difficulty: form.difficulty,
          objective_met: objective ? form.objectiveMet : null,
          opponent: form.opponent || null,
          result: form.result || null,
          score: form.score || null,
          performance: form.performance,
          went_well: form.wentWell || null,
          to_improve: form.toImprove || null,
          playing_time_min: form.playingTime ? parseInt(form.playingTime, 10) : null,
          flow: isGame && form.flowOn ? { skill_level: form.skill, flow_score: form.flow, triggers_fired: form.triggers } : null,
          flow_session_id: kind === 'game' ? stackSession : null,
        }),
      })
      if (res.ok) {
        setSaved(prev => ({ ...prev, [kind]: true }))
        setState('saved')
        clearDraft(key)
        notify(kind === 'game' ? 'Game reflection saved' : 'Practice saved')
        fetchRecent()
      } else {
        setState('error')
        const err = await res.json().catch(() => ({}))
        notify(err.error || 'Could not save. Please try again.', 'error')
      }
    } catch {
      setState('error')
      notify("Couldn't save. Try again.", 'error')
    }
  }

  const zone = flowZone(form.difficulty, form.skill)
  const diff = form.difficulty - form.skill
  const isGame = kind === 'game'
  const shownRecent = fixedKind ? recent.filter(e => e.kind === fixedKind) : recent

  if (loading) return <Skeleton />

  return (
    <div className="space-y-5">
      <div className="card p-6 space-y-5">
        <div>
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="font-semibold text-fg-1">{isGame ? 'Game day' : 'Sport practice'}</h3>
            {!fixedKind && (
              <div className="flex gap-1.5" role="tablist" aria-label="Log type">
              {(['practice', 'game'] as Kind[]).map(k => (
                <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => { setKind(k); setState('idle') }}
                  className={kind === k ? 'tab-btn-active text-xs' : 'tab-btn text-xs'}>
                  {k === 'practice' ? 'Practice' : 'Game'}
                  {saved[k] && <span className="text-cta"> ✓</span>}
                </button>
              ))}
            </div>
            )}
          </div>
          <p className="text-sm text-fg-4">
            {isGame
              ? 'Reflect on who you were out there, not just the scoreboard.'
              : 'Log what you trained and how hard it was. Difficulty feeds your flow state.'}
          </p>
        </div>

        <div>
          <label className="text-sm text-fg-3 block mb-1">Sport</label>
          {sports.length > 1 && (
            <div className="flex gap-2 mb-2">
              {sports.map(opt => (
                <button key={opt} type="button" onClick={() => update({ sport: opt })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    form.sport === opt ? 'bg-cta/20 border-cta text-cta' : 'border-edge text-fg-3 hover:text-fg-2'
                  }`}>
                  {opt}
                </button>
              ))}
            </div>
          )}
          <input value={form.sport} onChange={e => update({ sport: e.target.value })} placeholder="e.g. Basketball" aria-label="Sport" className="input-field" />
        </div>

        <Check checked={form.completed} onChange={v => update({ completed: v })} label={isGame ? 'Game played' : 'Practice complete'} />

        {isGame ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Opponent" value={form.opponent} onChange={v => update({ opponent: v })} placeholder="Who did you play?" />
              <Field label="Score" value={form.score} onChange={v => update({ score: v })} placeholder="e.g. 62–58" />
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <p className="text-sm text-fg-3 mb-1">Result</p>
                <div className="flex gap-1.5" role="radiogroup" aria-label="Result">
                  {(['win', 'loss', 'tie'] as const).map(r => (
                    <button key={r} type="button" role="radio" aria-checked={form.result === r}
                      onClick={() => update({ result: form.result === r ? '' : r })}
                      className={form.result === r ? 'tab-btn-active' : 'tab-btn'}>
                      {RESULT_LABEL[r]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="practice-playing-time" className="text-sm text-fg-3 block mb-1">Minutes played</label>
                <input id="practice-playing-time" type="number" inputMode="numeric" min="0" max="600" value={form.playingTime}
                  onChange={e => update({ playingTime: e.target.value })} placeholder="e.g. 28" className="w-28 input-field" />
              </div>
            </div>
            <RatingSlider label="Performance: how well did you play?" value={form.performance} onChange={v => update({ performance: v })} color="bg-cta" />
            {form.flowOn ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <RatingSlider label="Challenge" value={form.difficulty} onChange={v => update({ difficulty: v })} color="bg-cta" compact />
                  <RatingSlider label="Skill" value={form.skill} onChange={v => update({ skill: v })} color="bg-cta" compact />
                </div>
                <div className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl border px-4 py-3 text-center ${ZONE_COLOR[zone].tw}`}>
                  <span className="text-sm font-semibold">{ZONE_COLOR[zone].label}</span>
                  <span className="text-xs tabular-nums">challenge {form.difficulty} vs skill {form.skill} · {diff > 0 ? '+' : ''}{diff} (flow = within 1)</span>
                </div>
              </div>
            ) : (
              <RatingSlider label="Difficulty: how hard was the opponent / moment?" value={form.difficulty} onChange={v => update({ difficulty: v })} color="bg-cta" />
            )}
            <Area label="What went well?" value={form.wentWell} onChange={v => update({ wentWell: v })} placeholder="The plays, decisions or moments you want more of." />
            <Area label="What will you improve?" value={form.toImprove} onChange={v => update({ toImprove: v })} placeholder="One or two things to take into the next practice." />
            <Area label="What did you learn about yourself?" value={form.learned} onChange={v => update({ learned: v })} placeholder="How did you respond under pressure? Who showed up?" />
          </>
        ) : (
          <>
            <Area label="What did you train?" value={form.trained} onChange={v => update({ trained: v })} placeholder="Skills, drills, situations, film…" />
            <Area label="What did you learn?" value={form.learned} onChange={v => update({ learned: v })} placeholder="One thing that clicked, or one thing you still need." />
            <RatingSlider label="Difficulty: how hard was practice?" value={form.difficulty} onChange={v => update({ difficulty: v })} color="bg-cta" />
          </>
        )}

        {stackSession && kind === 'game' && (
          <p className="rounded-xl border border-cta/40 bg-cta/10 px-4 py-3 text-sm text-fg-2">
            Linked to today&apos;s pre-game Flow Stack. Your flow score below connects the stack to how you played.
          </p>
        )}

        {/* Flow thread (games only): difficulty is the challenge; flow needs it within 1 of skill */}
        {isGame && <div className="rounded-xl border border-cta/30 overflow-hidden">
          <button type="button" onClick={() => update({ flowOn: !form.flowOn })} aria-expanded={form.flowOn}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
            <div>
              <p className="text-sm font-semibold text-cta">Flow thread</p>
              <p className="text-xs text-fg-4">Flow lives where challenge and skill are within 1 point of each other. Your difficulty is today&apos;s challenge.</p>
            </div>
            <span className={`shrink-0 w-10 h-6 rounded-full border transition-colors relative ${form.flowOn ? 'bg-cta/30 border-cta' : 'bg-surface-2 border-edge'}`} aria-hidden="true">
              <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-[left,background-color] ${form.flowOn ? 'left-[18px] bg-cta' : 'left-0.5 bg-fg-4'}`} />
            </span>
          </button>
          {form.flowOn && (
            <div className="px-4 pb-4 space-y-4 border-t border-cta/20 pt-4">
              <RatingSlider label="Flow score: how in the zone were you?" value={form.flow} onChange={v => update({ flow: v })} color="bg-cta" />
              <div>
                <p className="text-sm text-fg-3 mb-2">Which triggers fired?</p>
                <div className="flex flex-wrap gap-2">
                  {TRIGGERS.map(t => (
                    <button key={t.code} type="button" onClick={() => toggleTrigger(t.code)} title={t.hint} aria-pressed={form.triggers.includes(t.code)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        form.triggers.includes(t.code) ? 'bg-cta/20 border-cta text-cta' : 'border-edge text-fg-3 hover:text-fg-2'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-fg-4">Saved to Mindset → Flow State as a flow log, so your insights include your games.</p>
            </div>
          )}
        </div>}

        {/* Daily objective from the Journal tab */}
        <div className="rounded-xl bg-surface-2/50 border border-edge-muted p-4">
          <p className="text-xs uppercase tracking-wider text-fg-4 mb-1">Today&apos;s objective</p>
          {objective ? (
            <>
              <p className="text-sm text-fg-2 mb-3">{objective}</p>
              <Check checked={form.objectiveMet} onChange={v => update({ objectiveMet: v })} label="I accomplished today's objective" />
            </>
          ) : (
            <p className="text-sm text-fg-4">
              No journal entry yet today.{' '}
              <Link href="/mindset?tab=Journal" className="text-cta font-medium hover:underline">Set your objective →</Link>
            </p>
          )}
        </div>

        <SaveButton type="button" state={state} idleLabel={saved[kind] ? 'Saved ✓' : isGame ? 'Save game reflection' : 'Save practice'} disabled={saved[kind]} onClick={save} className="sm:w-auto" />
      </div>

      <div>
        <h4 className="text-sm font-semibold text-fg-1 mb-3">Last 14 days</h4>
        {shownRecent.length === 0 ? (
          <p className="text-sm text-fg-4 text-center py-6">Nothing logged yet. Your first {fixedKind === 'game' ? 'game' : 'practice'} goes above.</p>
        ) : (
          <CollapsibleList className="space-y-2" items={shownRecent} visible={3} noun="older logs" render={e => (
              <div key={e.id} className="bg-surface rounded-xl border border-edge p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className={`shrink-0 text-xs uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${e.kind === 'game' ? 'bg-cta/15 text-cta' : 'bg-surface-3/60 text-fg-3'}`}>
                      {e.kind}
                    </span>
                    <p className="text-sm font-medium text-fg-2 truncate">
                      {e.sport || (e.kind === 'game' ? 'Game' : 'Practice')}
                      {e.kind === 'game' && e.opponent ? ` vs ${e.opponent}` : ''}
                      {e.kind === 'game' && e.result ? ` · ${RESULT_LABEL[e.result]}${e.score ? ` ${e.score}` : ''}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-fg-4 shrink-0">{format(parseISO(e.log_date), 'MMM d')}</span>
                </div>
                <p className="text-xs text-fg-4 mt-1 tabular-nums">
                  {e.difficulty != null ? `Difficulty ${e.difficulty}/10` : ''}
                  {e.performance != null ? ` · Performance ${e.performance}/10` : ''}
                  {e.flow_score != null ? ` · Flow ${e.flow_score}/10` : ''}
                  {e.objective_met === true ? ' · Objective ✓' : e.objective_met === false ? ' · Objective ✕' : ''}
                </p>
                {(e.trained || e.went_well) && <p className="text-xs text-fg-3 mt-1 line-clamp-2">{e.kind === 'game' ? e.went_well : e.trained}</p>}
              </div>
            )} />
        )}
      </div>
    </div>
  )
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
      <input type="checkbox" checked={checked} onChange={() => onChange(!checked)} className="sr-only peer" />
      <div aria-hidden="true" className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cta ${
        checked ? 'bg-cta border-cta' : 'border-edge hover:border-fg-3'
      }`}>
        {checked && (
          <svg className="w-4 h-4 text-fg-inverse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-fg-2 font-medium text-sm">{label}</span>
    </label>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="text-sm text-fg-3 block mb-1">{label}</label>
      <input id={id} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input-field" />
    </div>
  )
}

function Area({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="text-sm text-fg-3 block mb-1">{label}</label>
      <textarea id={id} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className="textarea-field" />
    </div>
  )
}

