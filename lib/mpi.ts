// Mental Performance Index — the 10 assessment dimensions scored 1–10,
// averaged and scaled to 0–100. Single source of truth shared by the
// weekly assessment, onboarding baseline, and progress views.

export const MPI_DIMENSIONS = [
  { key: 'self_identity_clarity', label: 'Self-Identity Clarity', description: 'How clear are you on who you are as an athlete?' },
  { key: 'confidence', label: 'Confidence', description: 'How confident do you feel in your abilities?' },
  { key: 'focus_quality', label: 'Focus Quality', description: 'How well can you lock in and stay present?' },
  { key: 'anxiety_management', label: 'Anxiety Management', description: 'How well are you managing pressure and nerves?' },
  { key: 'resilience', label: 'Resilience', description: 'How well do you bounce back from setbacks?' },
  { key: 'motivation', label: 'Motivation', description: 'How driven and motivated do you feel?' },
  { key: 'mental_imagery', label: 'Mental Imagery', description: 'How vivid and effective is your visualization?' },
  { key: 'routine_consistency', label: 'Routine Consistency', description: 'How consistent are your pre-performance routines?' },
  { key: 'team_relationships', label: 'Team Relationships', description: 'How connected do you feel with your teammates?' },
  { key: 'vision_clarity', label: 'Vision Clarity', description: 'How clear is your long-term vision and purpose?' },
] as const

export type MpiKey = typeof MPI_DIMENSIONS[number]['key']

export function calcMPI(scores: Partial<Record<MpiKey, number>>): number {
  const values = MPI_DIMENSIONS.map(d => scores[d.key] ?? 0)
  const avg = values.reduce((a, b) => a + b, 0) / MPI_DIMENSIONS.length
  return Math.round(avg * 10)
}

export function mpiVerdict(mpi: number): string {
  if (mpi >= 85) return 'Elite mental game — keep sharpening it.'
  if (mpi >= 70) return 'Strong foundation — a few areas to level up.'
  if (mpi >= 50) return 'Solid start — real gains are within reach.'
  return 'Big upside — this is exactly what MindFit trains.'
}
