import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

// Log the real database/SDK error server-side; send the user a generic one.
// The message can echo a submitted value (an email, a name), so only the
// error code goes to Sentry; the full text stays in the server log.
export function dbError(err: { message?: string; code?: string } | null | undefined, status = 500) {
  console.error('API error:', err?.message ?? err)
  Sentry.captureMessage(`API database error${err?.code ? ` (${err.code})` : ''}`, 'error')
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status })
}
