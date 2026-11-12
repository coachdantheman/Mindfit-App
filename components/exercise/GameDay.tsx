'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import BottomSheet from '@/components/shared/BottomSheet'
import SaveButton, { type SaveState } from '@/components/shared/SaveButton'
import Skeleton from '@/components/shared/Skeleton'
import PracticeLog from '@/components/exercise/PracticeLog'
import PregameStepEditor from '@/components/exercise/PregameStepEditor'
import { markFromGameDay } from '@/components/shared/BackToGameDay'
import { localDateISO } from '@/lib/dates'
import { formatClock, parseTime } from '@/lib/game-day'
import { loadNextGame, type UpcomingGame } from '@/lib/team-schedule'
import {
  activeRoutine, CUE_WORD_EXAMPLES, countdownLabel, DEFAULT_ROUTINE_NAME, DEFAULT_STEPS, EXTERNAL_TRIGGER_EXAMPLES,
  PHYSICAL_TRIGGER_EXAMPLES, runProgress, STEP_INFO, stepClock, triggersSet, type PregameStep, type PregameTriggers,
} from '@/lib/pregame'

interface Routine { id: string; user_id: string | null; team_id: string | null; name: string; steps: PregameStep[]; is_default: boolean }
interface TeamRoutine extends Routine { team_name: string }
interface RunRow { routine_id: string | null; routine_name: string; steps_done: string[]; total_steps: number }
interface PregameData { routines: Routine[]; teamRoutine: TeamRoutine | null; triggers: PregameTriggers | null; run: RunRow | null }
interface Choice { key: string; name: string; sub: string; steps: PregameStep[]; routine: Routine | null }
interface EditorState { id: string | null; name: string; steps: PregameStep[]; makeDefault: boolean }

interface Props {
  notify: (msg: string, kind?: 'success' | 'error') => void
  onOpenSchedule: () => void
}

const RING_R = 22
const RING_C = 2 * Math.PI * RING_R
const editable = (steps: PregameStep[]) => steps.filter(s => s.kind !== 'triggers')
const clockOf = (t: string | null) => { const m = parseTime(t); return m === null ? '' : formatClock(m) }
const dayLabel = (iso: string, today: string) =>
  iso === today ? 'Today' : new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const CHIP = 'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors'
const CHIP_ON = 'bg-cta/20 border-cta text-cta'
const CHIP_OFF = 'border-edge text-fg-3 hover:text-fg-2'

// Exercise → Game Day. Next game, the pregame routine run on a countdown,
// the athlete's three triggers, routine editing, and the post-game log.
export default function GameDay({ notify, onOpenSchedule }: Props) {
  const today = localDateISO()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PregameData | null>(null)
  const [savedTriggers, setSavedTriggers] = useState<PregameTriggers | null>(null)
  const [done, setDone] = useState<string[]>([])
  const [pickedKey, setPickedKey] = useState<string | null>(null)
  const [whyOpen, setWhyOpen] = useState<Record<string, boolean>>({})
  const [game, setGame] = useState<UpcomingGame | null | undefined>(undefined)
  const [gameTime, setGameTime] = useState('')
  const [cueWords, setCueWords] = useState<string[]>([])
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [editSave, setEditSave] = useState<SaveState>('idle')

  const load = useCallback(async () => {
    const res = await fetch(`/api/exercise/pregame?date=${today}`)
    if (!res.ok) throw new Error('load')
    const d: PregameData = await res.json()
    setData(d)
    setDone(d.run?.steps_done ?? [])
    setSavedTriggers(d.triggers)
  }, [today])

  useEffect(() => {
    load().catch(() => notify("Couldn't load Game Day.", 'error')).finally(() => setLoading(false))
  }, [load, notify])

  useEffect(() => {
    loadNextGame(today)
      .then(g => {
        setGame(g)
        if (g?.date === today && g.time) setGameTime(g.time.slice(0, 5))
      })
      .catch(() => setGame(null))
  }, [today])

  useEffect(() => {
    fetch('/api/mindset/flow-state/cue-words')
      .then(r => (r.ok ? r.json() : []))
      .then((rows: { cue_word: string; is_active?: boolean; kind?: string }[]) => {
        if (!Array.isArray(rows)) return
        setCueWords([...new Set(rows.filter(r => r.is_active !== false && (r.kind ?? 'cue') === 'cue').map(r => r.cue_word.trim()).filter(Boolean))])
      })
      .catch(() => {})
  }, [])

  if (loading) return <Skeleton />
  if (!data) {
    return (
      <div className="card p-5 text-center space-y-3">
        <p className="text-sm text-fg-3">Game Day didn't load.</p>
        <button type="button" onClick={() => { setLoading(true); load().catch(() => notify("Couldn't load Game Day.", 'error')).finally(() => setLoading(false)) }} className="btn-secondary">Try again</button>
      </div>
    )
  }

  const own = data.routines
  const teamRoutine = data.teamRoutine
  const base = activeRoutine(own, teamRoutine)
  const defaultKey = !base ? 'mindfit' : own.some(r => r.id === base.id) ? `own:${base.id}` : `team:${base.id}`
  const choices: Choice[] = [
    ...own.map(r => ({ key: `own:${r.id}`, name: r.name, sub: r.is_default ? 'Your default' : 'Your routine', steps: r.steps, routine: r })),
    ...(teamRoutine ? [{ key: `team:${teamRoutine.id}`, name: teamRoutine.name, sub: teamRoutine.team_name, steps: teamRoutine.steps, routine: teamRoutine }] : []),
    { key: 'mindfit', name: DEFAULT_ROUTINE_NAME, sub: 'Built on the research', steps: DEFAULT_STEPS, routine: null },
  ]
  const active = choices.find(c => c.key === (pickedKey ?? defaultKey)) ?? choices[0]
  const progress = runProgress(active.steps, done)
  const triggersOk = triggersSet(savedTriggers)
  const isOwnActive = !!active.routine?.user_id

  const toggle = async (stepId: string) => {
    const flip = (list: string[]) => (list.includes(stepId) ? list.filter(x => x !== stepId) : [...list, stepId])
    // Only this routine's steps count, so switching routines never carries ticks over.
    const next = flip(done).filter(id => active.steps.some(st => st.id === id))
    setDone(next)
    try { navigator.vibrate?.(10) } catch {}
    try {
      const res = await fetch('/api/exercise/pregame/run', {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          game_date: today,
          routine_id: active.routine?.id ?? null,
          routine_name: active.name,
          steps_done: next,
          total_steps: active.steps.length,
        }),
      })
      if (!res.ok) throw new Error('save')
    } catch {
      setDone(flip)
      notify("Couldn't save that step. Try again.", 'error')
    }
  }

  const scrollToTriggers = () => {
    document.getElementById('gameday-triggers')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const openEditor = (state: EditorState) => {
    setEditSave('idle')
    setEditor(state)
  }

  const saveRoutine = async () => {
    if (!editor) return
    const name = editor.name.trim()
    if (!name) { setEditSave('error'); notify('Give your routine a name.', 'error'); return }
    setEditSave('saving')
    try {
      const res = await fetch('/api/exercise/pregame', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ id: editor.id ?? undefined, name, steps: editor.steps, is_default: editor.makeDefault }),
      })
      const saved = await res.json().catch(() => ({}))
      if (!res.ok) { setEditSave('error'); notify(saved.error || 'Could not save the routine', 'error'); return }
      setEditSave('saved')
      setPickedKey(`own:${saved.id}`)
      setEditor(null)
      await load()
      notify('Routine saved')
    } catch {
      setEditSave('error')
      notify("Couldn't save. Try again.", 'error')
    }
  }

  const deleteRoutine = async () => {
    if (!editor?.id || !confirm('Delete this routine? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/exercise/pregame?id=${editor.id}`, { method: 'DELETE' })
      if (!res.ok) { notify('Could not delete the routine', 'error'); return }
      setEditor(null)
      setPickedKey(null)
      await load()
      notify('Routine deleted')
    } catch {
      notify("Couldn't delete. Try again.", 'error')
    }
  }

  return (
    <div className="space-y-5">
      {/* Next game */}
      <div className="card p-6 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-fg-4 mb-1">Next game</p>
          {game === undefined ? null : game ? (
            <p className="font-semibold text-fg-1 text-lg">
              {dayLabel(game.date, today)}{game.opponent ? ` vs ${game.opponent}` : ''}{game.time ? ` · ${clockOf(game.time)}` : ''}
            </p>
          ) : (
            <p className="text-sm text-fg-3">
              No game on your schedule.{' '}
              <button type="button" onClick={onOpenSchedule} className="text-cta font-medium hover:underline">Add it on the schedule →</button>
            </p>
          )}
        </div>
        <div>
          <label htmlFor="gameday-time" className="text-sm text-fg-3 block mb-1">Game time</label>
          <input id="gameday-time" type="time" value={gameTime} onChange={e => setGameTime(e.target.value)} className="input-field sm:w-40" />
        </div>
      </div>

      {/* Routine run */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 shrink-0">
            <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden className="-rotate-90">
              <circle cx="28" cy="28" r={RING_R} fill="none" stroke="currentColor" strokeWidth="4" className="text-edge" />
              <circle cx="28" cy="28" r={RING_R} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - progress.pct / 100)}
                className="text-cta transition-[stroke-dashoffset] duration-500" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums text-fg-1">
              {progress.done} / {progress.total}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-fg-4">Game day routine</p>
            <p className="font-semibold text-fg-1 truncate">{active.name}</p>
            <p className="text-xs text-fg-4 truncate">{active.sub}</p>
          </div>
        </div>

        {choices.length > 1 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Choose routine">
            {choices.map(c => (
              <button key={c.key} type="button" aria-pressed={c.key === active.key} onClick={() => setPickedKey(c.key)}
                className={`${CHIP} ${c.key === active.key ? CHIP_ON : CHIP_OFF}`}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {progress.complete && <p className="text-sm text-cta font-medium">Routine complete. Trust your work.</p>}

        <ol>
          {active.steps.map((s, i) => {
            const info = STEP_INFO[s.kind]
            const isDone = done.includes(s.id)
            const isLast = i === active.steps.length - 1
            const locked = s.kind === 'triggers' && !triggersOk && !isDone
            const time = (gameTime && stepClock(gameTime, s.minutes_before)) || countdownLabel(s.minutes_before)
            return (
              <li key={s.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <button type="button" onClick={() => toggle(s.id)} disabled={locked} aria-pressed={isDone}
                    aria-label={`${isDone ? 'Undo' : 'Mark'} ${s.title || info.label}`}
                    className={`w-11 h-11 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors disabled:opacity-40 ${
                      isDone ? 'bg-cta border-cta text-fg-inverse' : 'border-edge text-transparent hover:border-fg-3'
                    }`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  {!isLast && <span className="w-px flex-1 bg-edge-muted my-1" aria-hidden />}
                </div>
                <div className="min-w-0 flex-1 pb-6">
                  <p className="text-xs tabular-nums text-fg-4">{time}</p>
                  <p className={`font-semibold ${isDone ? 'text-fg-3' : 'text-fg-1'}`}>{s.title || info.label}</p>
                  {info.how && <p className="text-sm text-fg-3 mt-0.5">{info.how}</p>}

                  {s.kind === 'triggers' && (triggersOk ? (
                    <ul className="mt-2 space-y-1 text-sm text-fg-2">
                      <li>External: {savedTriggers?.external_trigger}</li>
                      <li>Physical: {savedTriggers?.physical_trigger}</li>
                      <li>Cue word: <span className="text-cta font-semibold">{savedTriggers?.cue_word}</span></li>
                    </ul>
                  ) : (
                    <button type="button" onClick={scrollToTriggers} className="mt-2 text-sm text-cta font-medium hover:underline">
                      Set your three triggers →
                    </button>
                  ))}

                  <div className="flex items-center gap-2 mt-1">
                    {info.href && <Link href={info.href} onClick={markFromGameDay} className="inline-flex items-center min-h-[44px] pr-2 text-sm text-cta font-medium hover:underline">Open →</Link>}
                    {info.why && (
                      <button type="button" onClick={() => setWhyOpen(w => ({ ...w, [s.id]: !w[s.id] }))} aria-expanded={!!whyOpen[s.id]}
                        className="inline-flex items-center min-h-[44px] px-2 text-sm text-fg-3 hover:text-fg-1">
                        Why {whyOpen[s.id] ? '▲' : '▼'}
                      </button>
                    )}
                  </div>
                  {info.why && whyOpen[s.id] && (
                    <div className="mt-2 rounded-xl bg-surface-2/50 p-3">
                      <p className="text-sm text-fg-2">{info.why}</p>
                      {info.source && <p className="text-xs text-fg-4 mt-1">{info.source}</p>}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Triggers */}
      <TriggersCard saved={savedTriggers} cueWords={cueWords} onSaved={setSavedTriggers} notify={notify} />

      {/* Routine editing */}
      <div className="card p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-fg-1">Routines</h3>
          <p className="text-sm text-fg-4">Your routine runs on the countdown above. Build it around what you actually do before you play.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isOwnActive ? (
            <button type="button" className="btn-secondary text-sm"
              onClick={() => { const r = active.routine!; openEditor({ id: r.id, name: r.name, steps: editable(r.steps), makeDefault: r.is_default }) }}>
              Edit routine
            </button>
          ) : (
            <button type="button" className="btn-secondary text-sm"
              onClick={() => openEditor({ id: null, name: active.name, steps: editable(active.steps), makeDefault: false })}>
              Make it mine
            </button>
          )}
          <button type="button" className="btn-secondary text-sm"
            onClick={() => openEditor({ id: null, name: 'My routine', steps: editable(DEFAULT_STEPS), makeDefault: false })}>
            New routine
          </button>
        </div>
      </div>

      {editor && (
        <BottomSheet title={editor.id ? 'Edit routine' : 'New routine'} onClose={() => setEditor(null)}>
          <div className="space-y-5">
            <div>
              <label htmlFor="routine-name" className="text-sm text-fg-3 block mb-1">Routine name</label>
              <input id="routine-name" value={editor.name} maxLength={60}
                onChange={e => { const name = e.target.value; setEditor(ed => (ed ? { ...ed, name } : ed)) }}
                className="input-field" />
            </div>
            <PregameStepEditor steps={editor.steps} onChange={steps => setEditor(ed => (ed ? { ...ed, steps } : ed))} />
            <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
              <input type="checkbox" checked={editor.makeDefault} onChange={e => { const makeDefault = e.target.checked; setEditor(ed => (ed ? { ...ed, makeDefault } : ed)) }}
                className="w-5 h-5 accent-cta" />
              <span className="text-sm text-fg-2">Use as my default</span>
            </label>
            <SaveButton type="button" state={editSave} idleLabel="Save routine" onClick={saveRoutine} />
            {editor.id && (
              <button type="button" onClick={deleteRoutine} className="w-full text-sm text-fg-4 hover:text-red-400 min-h-[44px]">
                Delete routine
              </button>
            )}
          </div>
        </BottomSheet>
      )}

      {/* After the game */}
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-fg-1">After the game</h3>
          <p className="text-sm text-fg-4">Log it while it is fresh.</p>
        </div>
        <PracticeLog notify={notify} fixedKind="game" />
      </div>
    </div>
  )
}

const TRIGGER_ROWS = [
  { key: 'cue_word', label: 'Cue word', hint: 'A short word that locks you in', max: 40, examples: CUE_WORD_EXAMPLES },
  { key: 'external_trigger', label: 'External trigger', hint: 'Something around you that starts your routine', max: 80, examples: EXTERNAL_TRIGGER_EXAMPLES },
  { key: 'physical_trigger', label: 'Physical trigger', hint: 'Something you do with your body', max: 80, examples: PHYSICAL_TRIGGER_EXAMPLES },
] as const

function TriggersCard({ saved, cueWords, onSaved, notify }: {
  saved: PregameTriggers | null
  cueWords: string[]
  onSaved: (t: PregameTriggers) => void
  notify: Props['notify']
}) {
  const [draft, setDraft] = useState({
    cue_word: saved?.cue_word ?? '',
    external_trigger: saved?.external_trigger ?? '',
    physical_trigger: saved?.physical_trigger ?? '',
  })
  const [state, setState] = useState<SaveState>('idle')

  const set = (key: keyof typeof draft, value: string) => {
    setDraft(d => ({ ...d, [key]: value }))
    setState('idle')
  }

  const save = async () => {
    setState('saving')
    try {
      const res = await fetch('/api/exercise/pregame/triggers', { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(draft) })
      const row = await res.json().catch(() => ({}))
      if (!res.ok) { setState('error'); notify(row.error || 'Could not save your triggers', 'error'); return }
      onSaved(row)
      setState('saved')
    } catch {
      setState('error')
      notify("Couldn't save. Try again.", 'error')
    }
  }

  return (
    <div id="gameday-triggers" className="card p-6 space-y-5 scroll-mt-24">
      <div>
        <h3 className="font-semibold text-fg-1">My three triggers</h3>
        <p className="text-sm text-fg-4">Three cues you run before every game. Keep them short and specific.</p>
      </div>

      {TRIGGER_ROWS.map(row => {
        const examples = row.key === 'cue_word' ? row.examples.filter(e => !cueWords.includes(e)) : row.examples
        return (
          <div key={row.key} className="space-y-2">
            <label htmlFor={`trigger-${row.key}`} className="text-sm text-fg-2 block">
              {row.label}
              <span className="block text-xs text-fg-4">{row.hint}</span>
            </label>
            <input id={`trigger-${row.key}`} value={draft[row.key]} maxLength={row.max} onChange={e => set(row.key, e.target.value)}
              className="input-field" />
            <div className="flex flex-wrap gap-1.5">
              {row.key === 'cue_word' && cueWords.map(w => (
                <button key={`mine-${w}`} type="button" onClick={() => set(row.key, w)}
                  className="px-2.5 py-1 rounded-full text-xs border border-cta/40 text-cta hover:bg-cta/10">{w}</button>
              ))}
              {examples.map(ex => (
                <button key={ex} type="button" onClick={() => set(row.key, ex)}
                  className="px-2.5 py-1 rounded-full text-xs border border-edge text-fg-3 hover:text-fg-2">{ex}</button>
              ))}
            </div>
          </div>
        )
      })}

      <SaveButton type="button" state={state} idleLabel="Save triggers" onClick={save} />
    </div>
  )
}
