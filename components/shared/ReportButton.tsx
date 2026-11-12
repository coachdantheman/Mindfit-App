'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import BottomSheet from '@/components/shared/BottomSheet'

type Kind = 'leaderboard_name' | 'coach_note'

// The flag stays in place; the confirm opens in a sheet portaled to <body>
// so tight rows (podium, league list) never resize. No free text.
// `compact` shows a small flag instead of the word.
export default function ReportButton({ kind, targetUserId, targetId, compact = false }: { kind: Kind; targetUserId?: string; targetId?: string; compact?: boolean }) {
  const [step, setStep] = useState<'idle' | 'confirm' | 'sending' | 'done' | 'error'>('idle')
  const what = kind === 'leaderboard_name' ? 'name' : 'note'

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

  const close = () => setStep(s => (s === 'sending' ? s : s === 'done' ? 'done' : 'idle'))
  const open = () => setStep(s => (s === 'done' ? s : 'confirm'))

  const sheet = step !== 'idle' && typeof document !== 'undefined' && createPortal(
    <BottomSheet title={`Report this ${what}`} onClose={close}>
      {step === 'done' ? (
        <p role="status" className="text-sm text-fg-2">Thanks. We review reports within 24 hours.</p>
      ) : step === 'error' ? (
        <p role="status" className="text-sm text-red-400">Could not send the report. Try again later.</p>
      ) : (
        <>
          <p className="text-sm text-fg-3">
            {kind === 'leaderboard_name'
              ? 'Flag this name if it is offensive or impersonates someone. We review every report within 24 hours.'
              : 'Flag this note if it is inappropriate. We review every report within 24 hours.'}
          </p>
          <div className="mt-5 flex gap-3">
            <button type="button" onClick={close} disabled={step === 'sending'} className="btn-secondary flex-1">Cancel</button>
            <button type="button" onClick={send} disabled={step === 'sending'} className="btn-primary flex-1">
              {step === 'sending' ? 'Sending…' : 'Report'}
            </button>
          </div>
        </>
      )}
    </BottomSheet>,
    document.body,
  )

  const reported = step === 'done'
  return (
    <>
      {compact ? (
        <button type="button" onClick={open} aria-label={reported ? 'Reported' : `Report this ${what}`} title={reported ? 'Reported' : 'Report'}
          className={`w-9 h-9 -my-2 inline-flex items-center justify-center rounded-lg ${reported ? 'text-cta' : 'text-fg-4/60 hover:text-fg-2'}`}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill={reported ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>
        </button>
      ) : (
        <button type="button" onClick={open} className="text-xs text-fg-4 hover:text-fg-2 min-h-[44px] px-2 inline-flex items-center">
          {reported ? 'Reported' : 'Report'}
        </button>
      )}
      {sheet}
    </>
  )
}
