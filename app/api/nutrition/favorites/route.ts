import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { perServingFromEntry } from '@/lib/nutrition'

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('food_favorites')
    .select('created_at, foods(*)')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((data ?? []).map(r => r.foods).filter(Boolean))
}

// Body is either { food_id } to star a food directly, or { entry_id } to
// star something already on the day's log. A logged entry with no linked
// food (manual or AI-estimated) first becomes one of the user's own foods,
// scaled back to a single serving, and the entry is linked to it so the
// star state stays in sync.
export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const admin = createAdminClient()

  if (typeof body.entry_id === 'string' && body.entry_id) {
    const { data: entry } = await admin
      .from('food_entries')
      .select('*')
      .eq('id', body.entry_id)
      .eq('user_id', auth.userId)
      .maybeSingle()
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

    let food = null
    if (entry.food_id) {
      const { data } = await admin.from('foods').select('*').eq('id', entry.food_id).maybeSingle()
      if (data && (data.user_id === null || data.user_id === auth.userId)) food = data
    }

    let created = false
    if (!food) {
      const { data: inserted, error: insertError } = await admin
        .from('foods')
        .insert({
          user_id: auth.userId,
          name: entry.food_name,
          category: 'other',
          serving_size: entry.serving_size ?? '1 serving',
          ...perServingFromEntry(entry),
          source: 'user',
        })
        .select()
        .single()
      if (insertError || !inserted) return NextResponse.json({ error: insertError?.message ?? 'Could not save food' }, { status: 500 })
      food = inserted
      created = true
      await admin.from('food_entries').update({ food_id: food.id }).eq('id', entry.id).eq('user_id', auth.userId)
    }

    const { error } = await admin
      .from('food_favorites')
      .upsert({ user_id: auth.userId, food_id: food.id }, { onConflict: 'user_id,food_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, food, created, entry_id: entry.id }, { status: 201 })
  }

  const { food_id } = body
  if (typeof food_id !== 'string') return NextResponse.json({ error: 'food_id or entry_id required' }, { status: 400 })

  const { error } = await admin
    .from('food_favorites')
    .upsert({ user_id: auth.userId, food_id }, { onConflict: 'user_id,food_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { food_id } = await req.json()
  if (typeof food_id !== 'string') return NextResponse.json({ error: 'food_id required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('food_favorites')
    .delete()
    .eq('user_id', auth.userId)
    .eq('food_id', food_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
