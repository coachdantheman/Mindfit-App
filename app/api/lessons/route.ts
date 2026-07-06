import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'
import { requireString } from '@/lib/validate'

const SECTIONS = [
  'journal', 'weekly_assessment', 'flow_state', 'visualization',
  'meditation', 'affirmations', 'goals', 'exercise', 'nutrition',
  'sleep', 'progress', 'general',
]

export async function GET(req: Request) {
  const auth = await verifyApiUser()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const section = searchParams.get('section')
  const all = searchParams.get('all') === '1' && auth.role === 'admin'

  const admin = createAdminClient()
  let query = admin
    .from('lessons')
    .select('*')
    .order('module_name')
    .order('sort_order')

  if (!all) query = query.eq('is_published', true)
  if (section && SECTIONS.includes(section)) query = query.eq('app_section', section)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await verifyApiUser('admin')
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const title = requireString(body.title, 200)
  const skool_url = requireString(body.skool_url, 500)
  const module_name = requireString(body.module_name, 200)

  if (!title || !module_name) {
    return NextResponse.json({ error: 'Title and module are required.' }, { status: 400 })
  }
  if (!skool_url || !/^https:\/\/(www\.)?skool\.com\//.test(skool_url)) {
    return NextResponse.json({ error: 'The URL must be a skool.com link.' }, { status: 400 })
  }
  if (!SECTIONS.includes(body.app_section)) {
    return NextResponse.json({ error: 'A valid app section is required.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('lessons')
    .insert({
      title,
      skool_url,
      module_name,
      app_section: body.app_section,
      sort_order: Number(body.sort_order) || 0,
      is_published: body.is_published !== false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: Request) {
  const auth = await verifyApiUser('admin')
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: 'Lesson id required' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) updates.title = requireString(body.title, 200)
  if (body.skool_url !== undefined) updates.skool_url = requireString(body.skool_url, 500)
  if (body.module_name !== undefined) updates.module_name = requireString(body.module_name, 200)
  if (body.app_section !== undefined && SECTIONS.includes(body.app_section)) updates.app_section = body.app_section
  if (body.sort_order !== undefined) updates.sort_order = Number(body.sort_order) || 0
  if (body.is_published !== undefined) updates.is_published = !!body.is_published

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('lessons')
    .update(updates)
    .eq('id', body.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const auth = await verifyApiUser('admin')
  if (auth instanceof NextResponse) return auth

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Lesson id required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('lessons').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
