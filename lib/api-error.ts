import { NextResponse } from 'next/server'

// Log the real database/SDK error server-side; send the user a generic one.
export function dbError(err: { message?: string } | null | undefined, status = 500) {
  console.error('API error:', err?.message ?? err)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status })
}
