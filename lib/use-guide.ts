'use client'
import { useEffect, useState } from 'react'
import { cached } from '@/lib/api-cache'
import { onGuideChanged } from '@/lib/guide'
import { guideFor, stageFor, type GuideCharacter, type Stage } from '@/lib/guide-characters'

export interface GuideState {
  // Athletes and admins who have picked a guide.
  eligible: boolean
  guide: GuideCharacter
  stage: Stage
  // Off when the athlete turned the character off in Settings.
  show: boolean
  first: string
}

// The signed-in athlete's guide character, for screens outside the Daily Guide.
export function useGuide(): GuideState {
  const [state, setState] = useState<GuideState>({ eligible: false, guide: guideFor(null), stage: 1, show: true, first: '' })

  useEffect(() => {
    const load = () => {
    cached('/api/profile', (p: { role?: string; guide_character?: unknown; guide_visible?: boolean; full_name?: string | null } | null) => {
      if (!p?.role) return
      setState(prev => ({
        ...prev,
        eligible: (p.role === 'member' || p.role === 'admin') && p.guide_character != null,
        guide: guideFor(p.guide_character),
        show: p.guide_visible !== false,
        first: p.full_name?.trim().split(/\s+/)[0] ?? '',
      }))
    }).catch(() => {})
    cached('/api/stats/overview', (s: { bestStreak?: number } | null) => {
      if (s) setState(prev => ({ ...prev, stage: stageFor(s.bestStreak) }))
    }).catch(() => {})
    }
    load()
    return onGuideChanged(load)
  }, [])

  return state
}
