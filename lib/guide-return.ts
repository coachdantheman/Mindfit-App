'use client'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { TodayData } from '@/lib/guide'

const KEY = 'mf-from-guide'
const TTL_MS = 3 * 60 * 60 * 1000

type Trip = { at: number; pillars: TodayData['pillars'] }

// Set when the athlete taps a step in the guide; the pillars snapshot lets the
// guide animate whichever ring closed while they were away.
export function markFromGuide(pillars: TodayData['pillars']) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), pillars })) } catch {}
}

export function readTrip(): Trip | null {
  try {
    const trip = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Trip | null
    return trip && Date.now() - trip.at < TTL_MS ? trip : null
  } catch {
    return null
  }
}

export function clearTrip() {
  try { sessionStorage.removeItem(KEY) } catch {}
}

// After a successful log: back to the guide if the athlete came from it.
export function useReturnToGuide() {
  const router = useRouter()
  return useCallback((delayMs = 900) => {
    if (!readTrip()) return
    setTimeout(() => router.push('/guide'), delayMs)
  }, [router])
}
