'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Character from '@/components/guide/art/Character'
import Skeleton from '@/components/shared/Skeleton'
import { monthLabel } from '@/components/leaderboard/types'
import { clearApiCache } from '@/lib/api-cache'
import { guideChanged } from '@/lib/guide'
import { ALL_GUIDES, EVOLVE_AT, earnText, guideFor, isGuideKey, isStarter, shownStage, stageFor, type GuideCharacter, type GuideKey, type Stage } from '@/lib/guide-characters'
import type { Collection as CollectionData } from '@/lib/guide-unlocks'
import { TITLES } from '@/lib/leaderboard-config'

// Every character but the Dragon, by how it is earned.
const GROUPS: { title: string; note: string; keys: GuideKey[] }[] = [
  { title: 'Starters', note: 'You pick one. The other two are earned.', keys: ['sparrow', 'dog', 'fish'] },
  { title: 'Leagues', note: 'Reach a weekly league once and its guide is yours.', keys: ['fox', 'lion', 'phoenix'] },
  { title: 'Titles', note: 'Finish a month holding the title.', keys: ['owl', 'bull', 'raccoon', 'sloth'] },
  { title: 'Milestones', note: 'What you build over time.', keys: ['tiger', 'stag', 'ram', 'chameleon', 'beaver'] },
]

const RING: Record<string, string> = { mind: 'Mind', body: 'Body', fuel: 'Fuel', rest: 'Rest' }

function focusText(g: GuideCharacter): string {
  if (!g.focus.length) return 'Keeps your day in its own order.'
  return `Puts ${g.focus.map(f => RING[f]).join(' and ')} first in your day.`
}

function Bar({ have, need }: { have: number; need: number }) {
  return (
    <div className="h-1 rounded-full bg-surface-3 overflow-hidden" aria-hidden>
      <div className="h-full bg-cta" style={{ width: `${Math.min(100, (have / need) * 100)}%` }} />
    </div>
  )
}

function Tile({ g, stage, owned, selected, fresh, earn, earned, progress, disabled, onChoose }: {
  g: GuideCharacter
  stage: Stage
  owned: boolean
  selected: boolean
  fresh: boolean
  earn: string
  // How an owned character was earned.
  earned: string
  progress?: [number, number]
  disabled: boolean
  onChoose: () => void
}) {
  return (
    <button type="button" aria-pressed={selected} disabled={!owned || disabled} onClick={onChoose}
      aria-label={owned ? `${g.name}${selected ? ', with you now' : ''}. ${earned}` : `${g.name}, locked. ${earn}${progress ? `. ${progress[0]} of ${progress[1]}` : ''}`}
      className={`relative rounded-2xl border p-3 flex flex-col items-center gap-1.5 text-center transition-colors ${selected ? 'border-cta bg-cta/[0.06]' : owned ? 'border-edge hover:border-cta/40' : 'border-edge-muted'}`}>
      {fresh && <span className="absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wider text-cta">New</span>}
      <Character species={g.key} stage={stage} size={64} className={owned ? '' : 'opacity-25'} />
      <span className={`text-sm font-medium ${owned ? 'text-fg-1' : 'text-fg-4'}`}>{g.name}</span>
      {owned ? (
        <>
          <span className={`text-[10px] ${selected ? 'text-cta' : 'text-fg-4'}`}>{selected ? 'With you now' : 'Tap to choose'}</span>
          <span className="text-[10px] leading-tight text-fg-4 break-words">{earned}</span>
        </>
      ) : (
        <>
          <span className="text-[10px] leading-tight text-fg-4 break-words">{earn}</span>
          {progress && progress[1] > 1 && (
            <span className="w-full mt-0.5 space-y-1">
              <Bar have={progress[0]} need={progress[1]} />
              <span className="block text-[10px] tabular-nums text-fg-4">{progress[0]} of {progress[1]}</span>
            </span>
          )}
        </>
      )}
    </button>
  )
}

// The collection screen: the guide with the athlete now, every character they
// own or can earn with how far along they are, and the outfits they keep.
export default function Collection() {
  const [data, setData] = useState<CollectionData | null>(null)
  // null = no guide picked yet.
  const [guideKey, setGuideKey] = useState<GuideKey | null>(null)
  // null = wear this month's title.
  const [outfit, setOutfit] = useState<string | null>(null)
  // The form of their starter they chose to wear. null = the newest one reached.
  const [picked, setPicked] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let live = true
    setFailed(false)
    Promise.all([
      fetch('/api/profile').then(r => (r.ok ? r.json() : null)),
      fetch('/api/guide/collection').then(r => (r.ok ? r.json() : null)),
    ]).then(([p, c]: [{ guide_character?: unknown; guide_outfit?: string | null; guide_stage?: number | null } | null, CollectionData | null]) => {
      if (!live) return
      if (!p || !c?.owned) return setFailed(true)
      setGuideKey(isGuideKey(p.guide_character) ? p.guide_character : null)
      setOutfit(p.guide_outfit ?? null)
      setPicked(p.guide_stage ?? null)
      setData({ ...c, fresh: c.fresh ?? [], outfits: c.outfits ?? [], progress: c.progress ?? {}, dragonMonths: c.dragonMonths ?? [], bestStreak: c.bestStreak ?? 0 })
      // Seeing them here counts as being told.
      if (c.fresh?.length) {
        fetch('/api/guide/collection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seen: c.fresh }) }).then(() => guideChanged()).catch(() => {})
      }
    }).catch(() => { if (live) setFailed(true) })
    return () => { live = false }
  }, [attempt])

  const save = async (body: Record<string, unknown>, undo: () => void) => {
    setBusy(true)
    setError(false)
    try {
      const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('save failed')
      clearApiCache('/api/profile')
      guideChanged()
    } catch {
      undo()
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  if (failed) {
    return (
      <div className="card p-5 text-center max-w-lg">
        <p className="text-sm text-fg-3">Could not load your guides.</p>
        <button type="button" onClick={() => setAttempt(a => a + 1)} className="btn-secondary text-sm mt-3">Retry</button>
      </div>
    )
  }
  if (!data) return <div className="max-w-lg"><Skeleton rows={5} /></div>

  const reached = stageFor(data.bestStreak)
  const stage = shownStage(data.bestStreak, picked)
  const myStarter = data.owned.find(isStarter)
  // Until a starter is picked, any of the three can be.
  const has = (key: GuideKey) => data.owned.includes(key) || (isStarter(key) && !myStarter)
  const current = guideKey ? guideFor(guideKey) : null
  const worn = outfit && data.outfits.includes(outfit) ? outfit : data.title
  const dragon = guideFor('dragon')
  const hasDragon = data.owned.includes('dragon')

  const choose = (key: GuideKey) => {
    if (key === guideKey || busy || !has(key)) return
    const prev = guideKey
    const before = data
    setGuideKey(key)
    if (!data.owned.includes(key)) setData({ ...data, owned: [...data.owned, key] })
    void save({ guide_character: key }, () => { setGuideKey(prev); setData(before) })
  }

  const wearForm = (st: Stage) => {
    if (st === stage || st > reached || busy) return
    const prev = picked
    // Choosing the newest form goes back to growing with the streak.
    const next = st === reached ? null : st
    setPicked(next)
    void save({ guide_stage: next }, () => setPicked(prev))
  }

  const wear = (key: string | null) => {
    if (key === outfit || busy) return
    const prev = outfit
    setOutfit(key)
    void save({ guide_outfit: key }, () => setOutfit(prev))
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="page-title">Your guides</h1>
        <p className="page-subtitle tabular-nums">{data.owned.length} of {ALL_GUIDES.length} collected</p>
      </div>

      <div className="space-y-6">
        {current ? (
          <div className="card p-5">
            <div className="flex items-center gap-4">
              <Character species={current.key} stage={stage} outfit={worn} size={112} className="shrink-0" />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider font-semibold font-mono text-fg-4">With you now</p>
                <h2 className="text-xl font-bold text-fg-1 leading-tight">
                  {current.name}{current.forms[stage - 1] !== current.name && <span className="text-fg-3 font-medium"> · {current.forms[stage - 1]}</span>}
                </h2>
                <p className="text-sm text-fg-3 mt-1">{current.tagline}</p>
                <p className="text-xs text-fg-4 mt-2">{focusText(current)}</p>
              </div>
            </div>
            {isStarter(current.key) && (
              <div className="mt-4 pt-4 border-t border-edge-muted">
                <div role="group" aria-label="Form" className="grid grid-cols-3 gap-2">
                  {([1, 2, 3] as const).map(st => {
                    const have = reached >= st
                    const form = current.forms[st - 1]
                    return (
                      <button key={st} type="button" aria-pressed={stage === st} disabled={!have || busy} onClick={() => wearForm(st)}
                        aria-label={have ? `${form}${stage === st ? ', showing now' : ''}` : `${form}, locked. Reach a ${EVOLVE_AT[st - 2]}-day best streak`}
                        className={`rounded-xl border px-1 py-2 flex flex-col items-center text-center gap-1 transition-colors ${stage === st ? 'border-cta bg-cta/[0.06]' : have ? 'border-edge hover:border-cta/40' : 'border-transparent'}`}>
                        <Character species={current.key} stage={st} state="steady" size={48} className={have ? '' : 'opacity-25'} />
                        <span className={`text-xs font-medium ${have ? 'text-fg-1' : 'text-fg-4'}`}>{form}</span>
                        <span className={`text-[10px] ${stage === st ? 'text-cta' : 'text-fg-4'}`}>{stage === st ? 'Showing now' : have ? 'Tap to wear' : `${EVOLVE_AT[st - 2]}-day best streak`}</span>
                      </button>
                    )
                  })}
                </div>
                {reached < 3 ? (
                  <div className="mt-3 space-y-1.5">
                    <Bar have={data.bestStreak} need={EVOLVE_AT[reached - 1]} />
                    <p className="text-xs text-fg-4 tabular-nums">Best streak {data.bestStreak} of {EVOLVE_AT[reached - 1]} days. Every form you reach is yours to keep and wear.</p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-fg-4">Fully grown. Wear whichever form you like best.</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="card p-5">
            <h2 className="font-semibold text-fg-1 text-sm">Pick your first guide</h2>
            <p className="text-sm text-fg-4 mt-1">Choose one of the three starters below. It walks you through each day and grows with your streak.</p>
          </div>
        )}

        {error && <p role="status" className="text-sm text-red-400">Could not save. Try again.</p>}

        {GROUPS.map(group => (
          <section key={group.title} aria-label={group.title}>
            <h2 className="text-xs uppercase tracking-wider font-semibold font-mono text-fg-4">{group.title}</h2>
            <p className="text-xs text-fg-4 mt-0.5 mb-2">{group.note}</p>
            <div role="group" aria-label={group.title} className="grid grid-cols-3 gap-2">
              {group.keys.map(key => (
                <Tile key={key} g={guideFor(key)} stage={stage} owned={has(key)} selected={guideKey === key} fresh={data.fresh.includes(key)}
                  earn={earnText(key, myStarter)} earned={key === myStarter ? 'Your first pick' : `Earned: ${earnText(key, myStarter)}`} progress={data.progress[key]} disabled={busy} onChoose={() => choose(key)} />
              ))}
            </div>
          </section>
        ))}

        <section aria-label="Champion">
          <h2 className="text-xs uppercase tracking-wider font-semibold font-mono text-fg-4">Champion</h2>
          <p className="text-xs text-fg-4 mt-0.5 mb-2">One athlete a month. Kept for good.</p>
          <div className={`card p-5 flex items-center gap-4 ${guideKey === 'dragon' ? 'border-cta bg-cta/[0.06]' : hasDragon ? 'border-cta/40' : ''}`}>
            <Character species="dragon" size={96} className={`shrink-0 ${hasDragon ? '' : 'opacity-25'}`} />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-fg-1">
                {dragon.name}{data.fresh.includes('dragon') && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-cta">New</span>}
              </h3>
              {hasDragon ? (
                <>
                  <p className="text-sm text-fg-3 mt-0.5">{dragon.tagline}</p>
                  <p className="text-xs text-fg-4 mt-1">How it is earned: {dragon.earn}.</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5 empty:hidden">
                    {data.dragonMonths.map(m => (
                      <li key={m} className="text-xs text-cta border border-cta/40 rounded-full px-2.5 py-0.5">#1 athlete · {monthLabel(m)}</li>
                    ))}
                  </ul>
                  <button type="button" aria-pressed={guideKey === 'dragon'} disabled={busy} onClick={() => choose('dragon')}
                    className={`mt-3 min-h-[44px] px-4 rounded-full border text-sm transition-colors ${guideKey === 'dragon' ? 'border-cta text-cta' : 'border-edge text-fg-2 hover:border-cta/40'}`}>
                    {guideKey === 'dragon' ? 'With you now' : 'Choose the Dragon'}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-fg-3 mt-0.5">{dragon.earn}.</p>
                  <p className="text-xs text-fg-4 mt-1">The month is stamped on it, and nobody can take it back.</p>
                  <Link href="/leaderboard" className="inline-flex items-center min-h-[44px] text-sm text-cta">See The Board</Link>
                </>
              )}
            </div>
          </div>
        </section>

        <div className="card p-5">
          <h2 className="font-semibold text-fg-1 mb-1 text-sm">Wardrobe</h2>
          <p className="text-sm text-fg-4 mb-4">Your guide dresses as your title. Every title you earn stays here.</p>
          <div role="group" aria-label="Outfit" className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={outfit === null} disabled={busy} onClick={() => wear(null)}
              className={`min-h-[44px] px-4 rounded-full border text-sm transition-colors ${outfit === null ? 'border-cta bg-cta/[0.06] text-fg-1' : 'border-edge text-fg-3 hover:border-cta/40'}`}>
              This month&apos;s title
            </button>
            {data.outfits.map(key => (
              <button key={key} type="button" aria-pressed={outfit === key} disabled={busy} onClick={() => wear(key)}
                className={`min-h-[44px] px-4 rounded-full border text-sm transition-colors ${outfit === key ? 'border-cta bg-cta/[0.06] text-fg-1' : 'border-edge text-fg-3 hover:border-cta/40'}`}>
                {TITLES.find(t => t.key === key)?.name ?? key}
              </button>
            ))}
          </div>
          {data.outfits.length === 0 && <p className="text-xs text-fg-4 mt-3">Earn a title on The Board and its outfit shows up here.</p>}
        </div>

        <p className="text-xs text-fg-4">
          To hide the character or turn Daily Guidance off, open <Link href="/settings#guide" className="text-cta">Settings</Link>.
        </p>
      </div>
    </div>
  )
}
