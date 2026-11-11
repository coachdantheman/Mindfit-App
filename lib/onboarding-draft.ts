import { MPI_DIMENSIONS, type MpiKey } from './mpi'

// Answers from /start wait on the device until the account exists, then
// /api/onboarding/complete saves them in one go.
const KEY = 'mf:onboarding'

export type OnboardingDraft = {
  name: string
  sport: string
  birthYear: number | null
  birthMonth: number | null
  scores: Partial<Record<MpiKey, number>>
}

export const EMPTY_DRAFT: OnboardingDraft = { name: '', sport: '', birthYear: null, birthMonth: null, scores: {} }

export function readDraft(): OnboardingDraft | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return { ...EMPTY_DRAFT, ...JSON.parse(raw) }
  } catch { return null }
}

export function saveDraft(d: OnboardingDraft) {
  try { localStorage.setItem(KEY, JSON.stringify(d)) } catch {}
}

export function clearDraft() {
  try { localStorage.removeItem(KEY) } catch {}
}

export function draftComplete(d: OnboardingDraft | null): d is OnboardingDraft & { birthYear: number; birthMonth: number } {
  return !!d && d.birthYear != null && d.birthMonth != null && MPI_DIMENSIONS.every(m => (d.scores[m.key] ?? 0) >= 1)
}

// Highest and lowest dimension; ties go to the earlier one in the list.
export function edgeAndGap(scores: Partial<Record<MpiKey, number>>): { edge: string; gap: string } {
  let edge: typeof MPI_DIMENSIONS[number] = MPI_DIMENSIONS[0]
  let gap: typeof MPI_DIMENSIONS[number] = MPI_DIMENSIONS[0]
  for (const d of MPI_DIMENSIONS) {
    if ((scores[d.key] ?? 0) > (scores[edge.key] ?? 0)) edge = d
    if ((scores[d.key] ?? 0) < (scores[gap.key] ?? 0)) gap = d
  }
  return { edge: edge.label, gap: gap.label }
}
