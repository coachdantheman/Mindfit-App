import { NextRequest, NextResponse } from 'next/server'
import { dbError } from '@/lib/api-error'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyApiUser } from '@/lib/api-auth'

const PAGE_SIZE = 50

// Quote the text so commas, parens and quotes cannot break the .or() filter;
// escape LIKE wildcards and backslashes inside the quotes.
function searchFilter(q: string) {
  const like = q.replace(/[\\%_]/g, c => `\\${c}`)
  const quoted = like.replace(/[\\"]/g, c => `\\${c}`)
  const pattern = `"%${quoted}%"`
  return `full_name.ilike.${pattern},email.ilike.${pattern}`
}

export async function GET(req: NextRequest) {
  const auth = await verifyApiUser('admin')
  if (auth instanceof NextResponse) return auth

  const params = req.nextUrl.searchParams
  const q = (params.get('q') ?? '').trim().slice(0, 60)
  const page = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE

  const admin = createAdminClient()
  let query = admin
    .from('profiles')
    .select('*, journal_entries(count)', { count: 'exact' })
  if (q) query = query.or(searchFilter(q))

  const { data: profiles, count, error } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, from + PAGE_SIZE - 1)

  if (error) return dbError(error)

  const rows = (profiles ?? []).map((p: { journal_entries?: { count: number }[]; [key: string]: unknown }) => ({
    ...p,
    entry_count: p.journal_entries?.[0]?.count ?? 0,
    journal_entries: undefined,
  }))

  return NextResponse.json({ rows, total: count ?? 0, page, pageSize: PAGE_SIZE })
}
