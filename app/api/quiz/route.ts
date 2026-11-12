import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { scoreQuiz, validateAnswers } from '@/lib/quiz'

export async function GET() {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('quiz_results')
    .select('id, answers, scores, top_need, created_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(2)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const [latest, previous] = data ?? []
  if (!latest) return NextResponse.json(null)
  return NextResponse.json({ ...latest, previous: previous ?? null })
}

export async function POST(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const answers = validateAnswers(body?.answers)
  if (!answers) return NextResponse.json({ error: 'Answer all ten questions.' }, { status: 400 })

  const { scores, top_need } = scoreQuiz(answers)
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('quiz_results')
    .insert({ user_id: auth.userId, answers, scores, top_need })
    .select('id, answers, scores, top_need, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
