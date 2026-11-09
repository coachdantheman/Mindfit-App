'use client'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/shared/Toast'
import { VAULT, VaultGroup, VaultPerson, vaultQuoteIndex } from '@/lib/data/quote-vault'
import { localDateISO } from '@/lib/dates'

type Kind = 'fav_quote' | 'pin_person'
type Filter = 'all' | 'pinned' | 'favorites' | VaultGroup

const GROUPS: VaultGroup[] = ['Anime & Animation', 'Film & TV', 'Athletes', 'Coaches & Teams']

function withKey(set: Set<string>, key: string, on: boolean) {
  const next = new Set(set)
  if (on) next.add(key)
  else next.delete(key)
  return next
}

export default function QuoteVault() {
  const notify = useToast()
  const [today] = useState(() => localDateISO())
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [pinned, setPinned] = useState<Set<string>>(new Set())
  const [offsets, setOffsets] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState<Filter>('all')
  const inFlight = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/mindset/vault')
      .then(r => r.json())
      .then((data: { favorites?: string[]; pinned?: string[] }) => {
        setFavorites(new Set(data.favorites ?? []))
        setPinned(new Set(data.pinned ?? []))
      })
      .catch(() => {})
  }, [])

  const toggle = async (kind: Kind, key: string) => {
    const busy = `${kind}:${key}`
    if (inFlight.current.has(busy)) return
    const current = kind === 'fav_quote' ? favorites : pinned
    const setter = kind === 'fav_quote' ? setFavorites : setPinned
    const on = !current.has(key)

    inFlight.current.add(busy)
    setter(prev => withKey(prev, key, on))
    try {
      const res = await fetch('/api/mindset/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, key, on }),
      })
      if (!res.ok) throw new Error('save failed')
    } catch {
      setter(prev => withKey(prev, key, !on))
      notify('Could not save. Please try again.', 'error')
    } finally {
      inFlight.current.delete(busy)
    }
  }

  const nextQuote = (personKey: string) =>
    setOffsets(o => ({ ...o, [personKey]: (o[personKey] ?? 0) + 1 }))

  const quoteFor = (p: VaultPerson) => {
    const offset = offsets[p.key] ?? 0
    const index = (vaultQuoteIndex(p, today) + offset) % p.quotes.length
    return p.quotes[index]
  }

  const visiblePeople = (): VaultPerson[] => {
    if (filter === 'pinned') return VAULT.filter(p => pinned.has(p.key))
    if (filter === 'all') return [...VAULT].sort((a, b) => Number(pinned.has(b.key)) - Number(pinned.has(a.key)))
    if (filter === 'favorites') return []
    return VAULT.filter(p => p.group === filter)
  }

  const savedQuotes = VAULT.flatMap(p =>
    p.quotes.filter(q => favorites.has(q.id)).map(q => ({ person: p, quote: q })),
  )

  const chipClass = (f: Filter) => (filter === f ? 'tab-btn-active text-xs' : 'tab-btn text-xs')
  const people = visiblePeople()

  return (
    <div className="space-y-6">
      <p className="text-sm text-fg-2 leading-relaxed">
        Words from the people who’ve been where you’re going. One quote per person, rotating daily. Pin the voices you need and save the lines that hit.
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setFilter('all')} className={chipClass('all')}>All</button>
        <button type="button" onClick={() => setFilter('pinned')} className={chipClass('pinned')}>Pinned</button>
        <button type="button" onClick={() => setFilter('favorites')} className={chipClass('favorites')}>Favorites</button>
        {GROUPS.map(g => (
          <button key={g} type="button" onClick={() => setFilter(g)} className={chipClass(g)}>{g}</button>
        ))}
      </div>

      {filter === 'favorites' ? (
        savedQuotes.length === 0 ? (
          <p className="text-sm text-fg-3">No saved quotes yet. Tap the heart on a quote to save it here.</p>
        ) : (
          <div className="space-y-4">
            {savedQuotes.map(({ person, quote }) => (
              <div key={quote.id} className="card p-5 space-y-4">
                <div className="min-w-0">
                  <p className="text-cta font-semibold">{person.name}</p>
                  <p className="text-xs text-fg-3">{person.source}</p>
                </div>
                <blockquote className="text-lg leading-relaxed text-fg-1">“{quote.text}”</blockquote>
                <button
                  type="button"
                  onClick={() => toggle('fav_quote', quote.id)}
                  aria-pressed={true}
                  className="tab-btn-active text-xs min-h-[44px] sm:min-h-0"
                >
                  ♥ Saved
                </button>
              </div>
            ))}
          </div>
        )
      ) : people.length === 0 ? (
        <p className="text-sm text-fg-3">No pinned voices yet. Pin a person to keep them at the top.</p>
      ) : (
        <div className="space-y-4">
          {people.map(p => {
            const quote = quoteFor(p)
            const isFav = favorites.has(quote.id)
            const isPinned = pinned.has(p.key)
            return (
              <div key={p.key} className="card p-5 space-y-4">
                <div className="min-w-0">
                  <p className="text-cta font-semibold">{p.name}</p>
                  <p className="text-xs text-fg-3">{p.source}</p>
                </div>
                <blockquote className="text-lg leading-relaxed text-fg-1">“{quote.text}”</blockquote>
                <div className="flex flex-wrap items-center gap-2">
                  {p.quotes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => nextQuote(p.key)}
                      className="tab-btn text-xs min-h-[44px] sm:min-h-0"
                    >
                      Next quote
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggle('fav_quote', quote.id)}
                    aria-pressed={isFav}
                    className={isFav ? 'tab-btn-active text-xs min-h-[44px] sm:min-h-0' : 'tab-btn text-xs min-h-[44px] sm:min-h-0'}
                  >
                    {isFav ? '♥ Saved' : '♡ Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle('pin_person', p.key)}
                    aria-pressed={isPinned}
                    className={isPinned ? 'tab-btn-active text-xs min-h-[44px] sm:min-h-0' : 'tab-btn text-xs min-h-[44px] sm:min-h-0'}
                  >
                    {isPinned ? 'Pinned' : 'Pin'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
