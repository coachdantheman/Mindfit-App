import { NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { cleanTrigger } from '@/lib/pregame'

export async function PUT(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth
  const body = await req.json().catch(() => ({}))

  const admin = createAdminClient()
  const { data, error } = await admin.from('pregame_triggers')
    .upsert({
      user_id: auth.userId,
      cue_word: cleanTrigger(body.cue_word, 40),
      external_trigger: cleanTrigger(body.external_trigger, 80),
      physical_trigger: cleanTrigger(body.physical_trigger, 80),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('cue_word, external_trigger, physical_trigger')
    .single()

  if (error) return dbError(error)
  return NextResponse.json(data)
}
