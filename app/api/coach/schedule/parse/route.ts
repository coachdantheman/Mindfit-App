import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { verifyApiUser } from '@/lib/api-auth'
import { aiQuota } from '@/lib/rate-limit'
import { requireAiConsent } from '@/lib/ai-consent'
import { isISODate, isPlainObject } from '@/lib/validate'
import { createAdminClient } from '@/lib/supabase-server'
import { extractJson } from '@/lib/ai-json'
import { cleanEvent } from '@/lib/schedule'

export const maxDuration = 60

const anthropic = new Anthropic({ timeout: 60_000, maxRetries: 1 })
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const
const MAX_BASE64 = 5_500_000

// Reads a pasted or uploaded season schedule and returns events for the
// coach to review. Nothing is saved here.
export async function POST(req: Request) {
  const auth = await verifyApiUser('coach', 'admin')
  if (auth instanceof NextResponse) return auth
  const overQuota = await aiQuota(auth.userId, 'schedule', 20)
  if (overQuota) return overQuota
  const noConsent = await requireAiConsent(createAdminClient(), auth.userId)
  if (noConsent) return noConsent

  const body = await req.json().catch(() => null)
  if (!isPlainObject(body)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  const text = typeof body.text === 'string' ? body.text.slice(0, 20000).trim() : ''
  const rawFile = isPlainObject(body.file) ? body.file : null
  const file: any = rawFile && typeof rawFile.data === 'string' && typeof rawFile.media_type === 'string' ? rawFile : null
  if (!text && !file) return NextResponse.json({ error: 'Paste the schedule or upload a screenshot or PDF.' }, { status: 400 })
  if (file && file.data.length > MAX_BASE64) return NextResponse.json({ error: 'That file is too big. Keep it under 4 MB.' }, { status: 400 })
  if (file && file.media_type !== 'application/pdf' && !IMAGE_TYPES.includes(file.media_type)) {
    return NextResponse.json({ error: 'Upload a PNG, JPG, WEBP or PDF.' }, { status: 400 })
  }

  const today = isISODate(body.today) ? body.today : new Date().toISOString().slice(0, 10)

  const system = `You read high school sports schedules and return every game and practice as JSON.
Return ONLY valid JSON, no markdown:
{ "events": [ { "kind": "game" | "practice", "event_date": "YYYY-MM-DD", "start_time": "HH:MM" (24h) or null, "opponent": string or null, "location": string or null, "home_away": "home" | "away" | "neutral" or null, "notes": string or null } ] }
Rules:
- Today is ${today}. When a date has no year, use the next occurrence on or after today minus 30 days.
- "vs" or "@ home" means home; "@" or "at" before an opponent means away.
- Scrimmages, tournaments and meets are games. Put tournament names in notes.
- Skip rows you can't read a date for. Never invent events.`

  const content: Anthropic.MessageParam['content'] = []
  if (file?.media_type === 'application/pdf') {
    content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: file.data } })
  } else if (file) {
    content.push({ type: 'image', source: { type: 'base64', media_type: file.media_type, data: file.data } })
  }
  content.push({ type: 'text', text: text ? `Schedule:\n${text}` : 'Read the schedule in this file.' })

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 8000,
      output_config: { effort: 'low' },
      system,
      messages: [{ role: 'user', content }],
    })
    const out = message.content.find(b => b.type === 'text')?.text ?? ''
    const parsed = extractJson(out) as { events?: unknown[] }
    const events = (Array.isArray(parsed?.events) ? parsed.events : []).map(cleanEvent).filter(Boolean)
    if (events.length === 0) return NextResponse.json({ error: 'No dates found. Try pasting the schedule as text.' }, { status: 422 })
    return NextResponse.json({ events })
  } catch (err: any) {
    console.error('schedule parse error:', err?.message || err)
    return NextResponse.json({ error: 'Could not read that schedule. Try again or paste it as text.' }, { status: 500 })
  }
}
