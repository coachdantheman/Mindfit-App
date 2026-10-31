import type { Entry, PillarPoints } from '@/lib/leaderboard'
import type { Level, Title } from '@/lib/leaderboard-config'

export type { Entry }

export interface MyStatus {
  displayName: string
  sport: string | null
  points: number
  pillars: PillarPoints
  clutchDays: number
  activeDays: number
  level: Level
  nextLevel: Level | null
  progress: number
  title: Title
  rank: number | null
  of: number
  visible: boolean
}

export interface LeaderboardResponse {
  period: { month: string; daysLeft: number; lastMonth: string }
  scope: 'all' | 'team'
  teamAvailable: boolean
  me: MyStatus | null
  thisMonth: { top: Entry[]; around: Entry[] | null; of: number }
  lastMonth: { podium: Entry[]; myRank: number | null; of: number }
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (parts[0] ?? 'A').slice(0, 2).toUpperCase()
}
