import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import { createAdminClient } from '@/lib/supabase-server'

// GET /api/journal — return all entries for the current user (optionally filter by ?date=)
export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  const adminSupabase = createAdminClient()
  let query = adminSupabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', session.user.id)
    .order('entry_date', { ascending: false })

  if (date) query = query.eq('entry_date', date)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/journal — create a new entry
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    entry_date, objective,
    action_step_1, action_step_2, action_step_3,
    strength_1, strength_2, strength_3,
    weakness, extra_notes,
    rating_motivation, rating_focus, rating_confidence, rating_anxiety,
  } = body

  const adminSupabase = createAdminClient()
  const { data, error } = await adminSupabase
    .from('journal_entries')
    .insert({
      user_id: session.user.id,
      entry_date,
      objective,
      action_step_1, action_step_2, action_step_3,
      strength_1, strength_2, strength_3,
      weakness,
      extra_notes: extra_notes || null,
      rating_motivation: Number(rating_motivation),
      rating_focus: Number(rating_focus),
      rating_confidence: Number(rating_confidence),
      rating_anxiety: Number(rating_anxiety),
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Mark email as registered
  await adminSupabase
    .from('approved_emails')
    .update({ registered: true })
    .eq('email', session.user.email)

  return NextResponse.json(data, { status: 201 })
}
