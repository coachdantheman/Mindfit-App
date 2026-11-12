'use client'
import { useEffect, useState } from 'react'
import type { DistanceUnit } from '@/types/exercise'

// Everything is stored imperial (lb, in, and each run's own distance unit).
// Metric athletes see and type kg / cm / km; we convert at the edges only.
export type Units = 'imperial' | 'metric'

const KEY = 'mf-units'
const NOTE_KEY = 'mf-units-note'
const EVENT = 'mf-units-change'
const LB_PER_KG = 2.20462
const CM_PER_IN = 2.54
const IMPERIAL_REGIONS = new Set(['US', 'LR', 'MM'])

const round = (n: number, step: number) => Math.round(n / step) * step

export const weightUnit = (u: Units) => (u === 'metric' ? 'kg' : 'lb')

// Stored lb → shown value (kg to 0.5, lb to 0.1).
export function showWeight(lb: number | null | undefined, u: Units): number | null {
  if (lb == null || !Number.isFinite(Number(lb))) return null
  return u === 'metric' ? round(Number(lb) / LB_PER_KG, 0.5) : round(Number(lb), 0.1)
}

// Typed value → lb to store (0.1 lb precision).
export function toLb(value: number | null | undefined, u: Units): number | null {
  if (value == null || !Number.isFinite(Number(value))) return null
  return u === 'metric' ? round(Number(value) * LB_PER_KG, 0.1) : Number(value)
}

export function showHeightCm(inches: number | null | undefined): number | null {
  return inches == null ? null : Math.round(Number(inches) * CM_PER_IN)
}
export function cmToIn(cm: number | null | undefined): number | null {
  return cm == null || !Number.isFinite(Number(cm)) ? null : round(Number(cm) / CM_PER_IN, 0.1)
}

// Default distance unit for a new run/sprint/swim entry.
export function defaultDistanceUnit(imperial: DistanceUnit, u: Units): DistanceUnit {
  if (u === 'imperial') return imperial
  return imperial === 'mi' ? 'km' : imperial === 'yd' ? 'm' : imperial
}

export function regionUnits(): Units {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || navigator.language
    const region = new Intl.Locale(loc).maximize().region
    return region && !IMPERIAL_REGIONS.has(region) ? 'metric' : 'imperial'
  } catch {
    return 'imperial'
  }
}

function read(): Units {
  try { return localStorage.getItem(KEY) === 'metric' ? 'metric' : 'imperial' } catch { return 'imperial' }
}

function remember(u: Units) {
  try { localStorage.setItem(KEY, u) } catch {}
  window.dispatchEvent(new Event(EVENT))
}

export async function saveUnits(u: Units) {
  remember(u)
  await fetch('/api/profile', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ units: u }),
  }).catch(() => {})
}

// Call once from the app shell with the profile's saved value. A new athlete
// (null) gets their phone region's system and a one-time note.
export function syncUnits(saved: string | null | undefined) {
  if (saved === 'imperial' || saved === 'metric') { if (read() !== saved) remember(saved); return }
  const u = regionUnits()
  if (u === 'metric') { try { localStorage.setItem(NOTE_KEY, '1') } catch {} }
  void saveUnits(u)
}

export function takeUnitsNote(): boolean {
  try {
    const show = localStorage.getItem(NOTE_KEY) === '1'
    if (show) localStorage.removeItem(NOTE_KEY)
    return show
  } catch { return false }
}

export function useUnits(): Units {
  const [u, setU] = useState<Units>('imperial')
  useEffect(() => {
    setU(read())
    const on = () => setU(read())
    window.addEventListener(EVENT, on)
    window.addEventListener('storage', on)
    return () => { window.removeEventListener(EVENT, on); window.removeEventListener('storage', on) }
  }, [])
  return u
}
