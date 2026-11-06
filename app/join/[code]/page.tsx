'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { clearPendingTeamCode, savePendingTeamCode } from '@/lib/team-code'

type State =
  | { kind: 'loading' }
  | { kind: 'invalid'; error: string }
  | { kind: 'signin'; name: string; coach: string | null }
  | { kind: 'joined'; name: string; already: boolean }
  | { kind: 'error'; error: string }

export default function JoinTeamPage({ params }: { params: { code: string } }) {
  const router = useRouter()
  const code = params.code.toUpperCase()
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    (async () => {
      const look = await fetch(`/api/teams/join?code=${encodeURIComponent(code)}`)
      const team = await look.json().catch(() => ({}))
      if (!look.ok) { setState({ kind: 'invalid', error: team.error || 'That link isn’t valid.' }); return }

      const r = await fetch('/api/teams/join', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }),
      })
      if (r.status === 401) {
        savePendingTeamCode(code)
        setState({ kind: 'signin', name: team.name, coach: team.coach_name })
        return
      }
      const data = await r.json().catch(() => ({}))
      clearPendingTeamCode()
      setState(r.ok
        ? { kind: 'joined', name: data.team.name, already: data.outcome === 'already' }
        : { kind: 'error', error: data.error || 'Could not join that team.' })
    })()
  }, [code])

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-page">
      <div className="card p-8 w-full max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-cta mb-4">MindFit</p>
        {state.kind === 'loading' && <p className="text-sm text-fg-3">Checking your team link…</p>}
        {(state.kind === 'invalid' || state.kind === 'error') && (
          <>
            <p className="text-fg-1 font-semibold mb-2">{state.error}</p>
            <p className="text-sm text-fg-4 mb-6">Ask your coach for the current code. You can enter it any time under Settings → Sharing.</p>
            <Link href="/" className="btn-secondary inline-block">Go to MindFit</Link>
          </>
        )}
        {state.kind === 'signin' && (
          <>
            <h1 className="text-xl font-bold text-fg-1 mb-2">Join {state.name}</h1>
            <p className="text-sm text-fg-3 mb-6">
              {state.coach ? `Coach ${state.coach} invited you.` : 'Your coach invited you.'} Create your free account or sign in, and you’ll be added to the team automatically.
            </p>
            <Link href="/login" className="btn-primary inline-block w-full">Continue</Link>
          </>
        )}
        {state.kind === 'joined' && (
          <>
            <h1 className="text-xl font-bold text-fg-1 mb-2">{state.already ? `You’re already on ${state.name}` : `You joined ${state.name}`}</h1>
            <p className="text-sm text-fg-3 mb-6">Your coach can now see your progress, and your team shows up on The Board.</p>
            <button type="button" onClick={() => { router.push('/leaderboard'); router.refresh() }} className="btn-primary w-full">See The Board</button>
          </>
        )}
      </div>
    </main>
  )
}
