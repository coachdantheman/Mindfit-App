import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  const { email } = await req.json()

  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('approved_emails')
    .select('registered')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (error || !data || data.registered) {
    return NextResponse.json(
      { error: "This email isn't available for signup. Contact your coach if you need access." },
      { status: 403 }
    )
  }

  return NextResponse.json({ ok: true })
}
