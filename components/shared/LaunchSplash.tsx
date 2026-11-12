'use client'
import { useEffect, useState } from 'react'
import Splash from '@/components/shared/Splash'

const KEY = 'mf-launched'
const MIN_MS = 1200

// Launch screen for the iPhone app and home-screen installs (CSS hides it on
// the website). Server-rendered so it covers the first paint, then fades out
// once per launch; reloads within the same session skip it.
export default function LaunchSplash() {
  const [phase, setPhase] = useState<'show' | 'fade' | 'gone'>('show')

  useEffect(() => {
    let seen = false
    try { seen = sessionStorage.getItem(KEY) === '1'; sessionStorage.setItem(KEY, '1') } catch {}
    if (seen) { setPhase('gone'); return }
    const started = performance.now()
    let t1: ReturnType<typeof setTimeout>, t2: ReturnType<typeof setTimeout>
    const done = () => {
      t1 = setTimeout(() => {
        setPhase('fade')
        t2 = setTimeout(() => setPhase('gone'), 450)
      }, Math.max(0, MIN_MS - (performance.now() - started)))
    }
    if (document.readyState === 'complete') done()
    else window.addEventListener('load', done, { once: true })
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('load', done) }
  }, [])

  if (phase === 'gone') return null
  return (
    <div className={`mf-launch${phase === 'fade' ? ' mf-launch-out' : ''}`} aria-hidden={phase === 'fade'}>
      <Splash />
    </div>
  )
}
