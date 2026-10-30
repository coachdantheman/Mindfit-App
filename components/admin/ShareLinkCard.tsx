'use client'
import { useEffect, useState } from 'react'

const LOGIN_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://mindfit.academy') + '/login'

export default function ShareLinkCard() {
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => { setCanShare(typeof navigator.share === 'function') }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(LOGIN_URL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  const share = () => navigator.share({ title: 'MindFit', text: 'Create your free MindFit account', url: LOGIN_URL }).catch(() => {})

  return (
    <div>
      <h3 className="font-semibold text-fg-1 mb-1">Share the app</h3>
      <p className="text-sm text-fg-4 mb-3">Anyone with this link can create a free account. Text it to a team or drop it in a group chat.</p>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex-1 min-w-0 bg-surface-2 border border-edge rounded-xl px-3 py-2.5 text-sm text-fg-3 truncate">{LOGIN_URL}</div>
        <div className="flex gap-2">
          <button type="button" onClick={copy} className="btn-secondary flex-1 sm:flex-none">{copied ? 'Copied ✓' : 'Copy link'}</button>
          {canShare && <button type="button" onClick={share} className="btn-primary flex-1 sm:flex-none">Share</button>}
        </div>
      </div>
    </div>
  )
}
