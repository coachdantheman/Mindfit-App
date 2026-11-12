import * as Sentry from '@sentry/nextjs'
import { missingServerEnv } from './lib/env-check'

export async function register() {
  if (process.env.NODE_ENV === 'production') {
    const missing = missingServerEnv()
    if (missing.length) console.error(`Missing required env vars: ${missing.join(', ')}`)
  }
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./sentry.server.config')
  if (process.env.NEXT_RUNTIME === 'edge') await import('./sentry.edge.config')
}

export const onRequestError = Sentry.captureRequestError
