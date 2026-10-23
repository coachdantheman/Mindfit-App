import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { clampNumber } from '@/lib/validate'

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const [{ data: profile }, { data: weighIn }, { data: goal }] = await Promise.all([
    admin.from('athlete_profiles').select('*').eq('user_id', auth.userId).maybeSingle(),
    admin.from('weigh_ins').select('weight_lb').eq('user_id', auth.userId).order('entry_date', { ascending: false }).limit(1).maybeSingle(),
    admin.from('nutrition_goals').select('current_weight_lb').eq('user_id', auth.userId).maybeSingle(),
  ])

  const suggested = weighIn?.weight_lb != null
    ? Number(weighIn.weight_lb)
    : goal?.current_weight_lb != null ? Number(goal.current_weight_lb) : null

  return NextResponse.json({ profile: profile ?? null, suggested_bodyweight_lb: suggested })
}

export async function PUT(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const sex = body.sex === 'male' || body.sex === 'female' ? body.sex : null
  const bodyweight = clampNumber(body.bodyweight_lb, 50, 500)
  const age = clampNumber(body.age, 10, 80)
  if (!sex || bodyweight === null || age === null || Number(body.bodyweight_lb) < 50 || Number(body.bodyweight_lb) > 500) {
    return NextResponse.json({ error: 'Sex, bodyweight (50–500 lb) and age (10–80) are required.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('athlete_profiles')
    .upsert({
      user_id: auth.userId,
      sex,
      bodyweight_lb: Math.round(bodyweight * 10) / 10,
      age: Math.round(age),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
