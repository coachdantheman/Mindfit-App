'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// Last-resort screen when the root layout itself fails. It replaces the whole
// document, so it carries its own styles.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error) }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0F1A', color: '#F5F5F4', fontFamily: 'system-ui, sans-serif', padding: 24, textAlign: 'center' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ fontSize: 14, opacity: 0.7, margin: '0 0 20px' }}>Your data is safe. Try again, and if it keeps happening, email daniel@mindfit.academy.</p>
          <button onClick={() => reset()} style={{ background: '#C4B400', color: '#0A0F1A', border: 0, borderRadius: 12, padding: '12px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Try again</button>
        </div>
      </body>
    </html>
  )
}
