'use client'
import { useEffect, useState } from 'react'

const LINES = [
  'Lock in.',
  'Identity first. Performance follows.',
  'Breathe. Then go to work.',
  'Train the mind like the body.',
  'Calm is a skill.',
]

// App-open screen. The mark fills with gold on one slow breath, so the wait
// reads as the first rep of the session instead of a spinner.
export default function Splash() {
  // Picked after hydration so server and client HTML match.
  const [line, setLine] = useState(LINES[0])
  useEffect(() => { setLine(LINES[Math.floor(Math.random() * LINES.length)]) }, [])
  return (
    <div className="mf-splash" role="status" aria-label="Loading MindFit">
      <div className="mf-splash-mark" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-color.png" alt="" width={72} height={72} className="mf-splash-ghost" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-color.png" alt="" width={72} height={72} className="mf-splash-fill" />
      </div>
      <p className="mf-splash-line">{line}</p>
      <div className="mf-splash-bar" aria-hidden="true"><span /></div>
    </div>
  )
}
