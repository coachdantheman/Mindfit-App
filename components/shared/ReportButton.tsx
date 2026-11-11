'use client'
import { useState } from 'react'

type Kind = 'leaderboard_name' | 'coach_note'

// Inline two-step report: Report → confirm row. No prompt, no free text.
export default function ReportButton({ kind, targetUserId, targetId }: { kind: Kind; targetUserId?: string; targetId?: string }) {
  const [step, setStep] = useState<'idle' | 'confirm' | 'sending' | 'done' | 'error'>('idle')

  const send = async () => {
    setStep('sending')
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, target_user_id: targetUserId, target_id: targetId }),
      })
      setStep(res.ok ? 'done' : 'error')
    } catch {
      setStep('error')
    }
  }

  if (step === 'done') return <p role="status" className="text-xs text-fg-4 py-2 px-1">Thanks. We review reports within 24 hours.</p>
  if (step === 'error') return <p role="status" className="text-xs text-red-400 py-2 px-1">Could not send the report. Try again later.</p>

  if (step === 'confirm' || step === 'sending') {
    const label = kind === 'leaderboard_name' ? 'Report this name?' : 'Report this note?'
    return (
      <div className="flex items-center gap-2 text-xs text-fg-2 flex-wrap">
        <span>{label}</span>
        <button type="button" onClick={() => setStep('idle')} disabled={step === 'sending'} className="min-h-[44px] px-2 text-fg-4 hover:text-fg-2">Cancel</button>
        <button type="button" onClick={send} disabled={step === 'sending'} className="min-h-[44px] px-2 text-cta hover:text-fg-1">
          {step === 'sending' ? 'Sending…' : 'Report'}
        </button>
      </div>
    )
  }

  return (
    <button type="button" onClick={() => setStep('confirm')} className="text-xs text-fg-4 hover:text-fg-2 min-h-[44px] px-2 inline-flex items-center">
      Report
    </button>
  )
}
