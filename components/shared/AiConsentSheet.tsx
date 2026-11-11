'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import BottomSheet from '@/components/shared/BottomSheet'

// null = not checked yet, otherwise the last answer from the server.
let cached: boolean | null = null

export function setCachedAiAllowed(allowed: boolean) {
  cached = allowed
}

interface SheetProps {
  hideWhatIsSent: boolean
  onAllow: () => Promise<boolean>
  onDecline: () => void
}

export function AiConsentSheet({ hideWhatIsSent, onAllow, onDecline }: SheetProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const allow = async () => {
    setBusy(true); setError('')
    const ok = await onAllow()
    if (!ok) { setError('Could not turn on AI features. Try again.'); setBusy(false) }
  }

  return (
    <BottomSheet title="Turn on AI features?" onClose={onDecline}>
      <div className="space-y-4 text-sm text-fg-2">
        <p>{hideWhatIsSent
          ? 'MindFit uses Claude, an AI model made by Anthropic, to read a schedule you upload and turn it into team events.'
          : 'MindFit uses Claude, an AI model made by Anthropic, to estimate nutrition from a meal you describe and to build training plans.'}</p>
        <ul className="list-disc pl-5 space-y-2 text-fg-3">
          <li>{hideWhatIsSent
            ? 'What is sent: the schedule file you upload.'
            : 'What is sent: the text you type (a meal or a food), or your sport, goals, experience and training days.'}</li>
          <li>What is not sent: your name, email, journal, or photos.</li>
          <li>Anthropic&rsquo;s terms say it is not used to train their models. You can turn this off any time in Settings.</li>
        </ul>
        <p className="text-xs text-fg-4">
          Read the <Link href="/privacy" className="underline text-cta">Privacy Policy</Link>.
        </p>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="space-y-2">
          <button type="button" onClick={allow} disabled={busy} className="btn-primary w-full">Allow AI features</button>
          <button type="button" onClick={onDecline} disabled={busy} className="btn-secondary w-full">Not now</button>
        </div>
      </div>
    </BottomSheet>
  )
}

// Returns ensure(), which resolves true once AI features are allowed (asking first if needed), and the sheet to render.
export function useAiConsent({ hideWhatIsSent = false }: { hideWhatIsSent?: boolean } = {}) {
  const [open, setOpen] = useState(false)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const finish = (ok: boolean) => {
    setOpen(false)
    resolver.current?.(ok)
    resolver.current = null
  }

  const ensure = async (): Promise<boolean> => {
    if (cached === null) {
      try {
        const res = await fetch('/api/me/ai-consent')
        if (res.ok) cached = (await res.json()).allowed === true
      } catch { /* fall through and ask */ }
    }
    if (cached === true) return true
    return new Promise<boolean>(resolve => {
      resolver.current = resolve
      setOpen(true)
    })
  }

  const allow = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/me/ai-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allow: true }),
      })
      if (!res.ok) return false
      cached = true
      finish(true)
      return true
    } catch {
      return false
    }
  }

  const sheet = open ? (
    <AiConsentSheet hideWhatIsSent={hideWhatIsSent} onAllow={allow} onDecline={() => finish(false)} />
  ) : null

  return { ensure, sheet }
}
