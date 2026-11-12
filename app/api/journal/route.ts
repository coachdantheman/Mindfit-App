import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { verifyApiUser } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { clampNumber, isISODate } from '@/lib/validate'

const TEXT_FIELDS = ['objective', 'action_step_1', 'action_step_2', 'action_step_3', 'strength_1', 'strength_2', 'strength_3', 'weakness', 'extra_notes'] as const

// Shared by POST (create) and PUT (finish a quick check-in).
function parseJournalBody(body: Record<string, any>) {
  if (TEXT_FIELDS.some(k => body[k] != null && (typeof body[k] !== 'string' || body[k].length > 4000))) {
    return { error: 'Each journal answer must be text under 4,000 characters.' }
  }
  const { objective, action_step_1, action_step_2, action_step_3, strength_1, strength_2, strength_3, weakness, extra_notes } = body

  if (!isISODate(body.entry_date)) {
    return { error: 'A valid entry date is required.' }
  }
  const ratings = {
    rating_motivation: clampNumber(body.rating_motivation, 1, 10),
    rating_focus: clampNumber(body.rating_focus, 1, 10),
    rating_confidence: clampNumber(body.rating_confidence, 1, 10),
    rating_anxiety: clampNumber(body.rating_anxiety, 1, 10),
  }
  if (Object.values(ratings).some((r) => r === null)) {
    return { error: 'All ratings must be numbers between 1 and 10.' }
  }

  return {
    entry_date: body.entry_date as string,
    fields: {
      objective,
      action_step_1, action_step_2, action_step_3,
      strength_1, strength_2, strength_3,
      weakness,
      extra_notes: extra_notes || null,
      ...ratings,
    },
  }
}

// GET /api/journal — return all entries for the current user (optionally filter by ?date=)
export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  const adminSupabase = createAdminClient()
  let query = adminSupabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', auth.userId)
    .order('entry_date', { ascending: false })

  if (date) query = query.eq('entry_date', date)

  if (!date) query = query.limit(400)

  const { data, error } = await query
  if (error) return dbError(error)
  return NextResponse.json(data)
}

// POST /api/journal — create a new entry
export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const parsed = parseJournalBody(body)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const adminSupabase = createAdminClient()
  const { data, error } = await adminSupabase
    .from('journal_entries')
    .insert({
      user_id: auth.userId,
      entry_date: parsed.entry_date,
      ...parsed.fields,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: "You've already submitted today's journal." },
        { status: 409 }
      )
    }
    return dbError(error)
  }

  return NextResponse.json(data, { status: 201 })
}

// PUT /api/journal — finish or edit the caller's own entry for entry_date
export async function PUT(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = (await req.json().catch(() => null)) ?? {}
  const parsed = parseJournalBody(body)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  // Only a quick check-in entry can be finished this way; a full entry is never overwritten.
  const adminSupabase = createAdminClient()
  const { data, error } = await adminSupabase
    .from('journal_entries')
    .update(parsed.fields)
    .eq('user_id', auth.userId)
    .eq('entry_date', parsed.entry_date)
    .eq('action_step_1', '').eq('strength_1', '').eq('weakness', '')
    .select()
    .maybeSingle()

  if (error) return dbError(error)
  if (!data) return NextResponse.json({ error: 'No journal entry for that date.' }, { status: 404 })
  return NextResponse.json(data)
}
