'use client'
import { useEffect } from 'react'
import { useToast } from '@/components/shared/Toast'
import { clearPendingTeamCode, joinTeam, readPendingTeamCode } from '@/lib/team-code'

// Finishes a /join link once the athlete is signed in.
export default function PendingTeamJoin() {
  const notify = useToast()
  useEffect(() => {
    const code = readPendingTeamCode()
    if (!code) return
    clearPendingTeamCode()
    joinTeam(code).then(r => notify(r.ok ? `You joined ${r.teamName}` : r.error, r.ok ? 'success' : 'error'))
  }, [notify])
  return null
}
