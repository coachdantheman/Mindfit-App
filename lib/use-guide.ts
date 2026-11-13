'use client'
import { useEffect, useState } from 'react'
import { cached } from '@/lib/api-cache'
import { onGuideChanged } from '@/lib/guide'
import { guideFor, stageFor, type GuideCharacter, type Stage } from '@/lib/guide-characters'
import { sportKey } from '@/components/guide/art/Wear'

export interface GuideState {
  // Athletes and admins who have picked a guide.
  eligible: boolean
  guide: GuideCharacter
  stage: Stage
  // Off when the athlete turned the character off in Settings.
  show: boolean
  first: string
  // The title the guide is dressed as: the athlete's pick, else this month's.
  outfit: string | null
  sport: string | null
  // Characters earned since the athlete was last told.
  fresh: string[]
}

type Collection = { fresh?: string[]; outfits?: string[]; title?: string | null }

// One request for everyone on the page who asks.
let collection: Promise<Collection | null> | null = null
const loadCollection = () => (collection ??= fetch('/api/guide/collection').then(r => (r.ok ? r.json() : null)).catch(() => null))

// The signed-in athlete's guide character, for screens outside the Daily Guide.
export function useGuide(): GuideState {
  const [state, setState] = useState<GuideState>({ eligible: false, guide: guideFor(null), stage: 1, show: true, first: '', outfit: null, sport: null, fresh: [] })

  useEffect(() => {
    const load = (changed = false) => {
      if (changed) collection = null
      cached('/api/profile', (p: { role?: string; guide_character?: unknown; guide_visible?: boolean; guide_outfit?: string | null; primary_sport?: string | null; full_name?: string | null } | null) => {
        if (!p?.role) return
        const eligible = (p.role === 'member' || p.role === 'admin') && p.guide_character != null
        setState(prev => ({
          ...prev,
          eligible,
          guide: guideFor(p.guide_character),
          show: p.guide_visible !== false,
          first: p.full_name?.trim().split(/\s+/)[0] ?? '',
          sport: sportKey(p.primary_sport),
        }))
        if (!eligible) return
        loadCollection().then(c => {
          if (!c) return
          const picked = p.guide_outfit && c.outfits?.includes(p.guide_outfit) ? p.guide_outfit : null
          setState(prev => ({ ...prev, outfit: picked ?? c.title ?? null, fresh: c.fresh ?? [] }))
        })
      }).catch(() => {})
      cached('/api/stats/overview', (s: { bestStreak?: number } | null) => {
        if (s) setState(prev => ({ ...prev, stage: stageFor(s.bestStreak) }))
      }).catch(() => {})
    }
    load()
    return onGuideChanged(() => load(true))
  }, [])

  return state
}
