import type { SupabaseClient } from '@supabase/supabase-js'
import { notifyMany, type Message, type NotifyCounts } from '@/lib/notify'
import { chunk } from '@/lib/fetch-all'

// Messages wait in notification_queue until they are sent. A run that
// hits its time limit, or a database error, leaves the rest for the next
// run. A message is logged as sent just before it goes out, so a run killed
// mid-batch can drop that one batch (at most BATCH messages), never more
// and never a double send.
// Anything still waiting after EXPIRE_HOURS is dropped: a 6 pm reminder
// should not arrive in the middle of the night.
const EXPIRE_HOURS = 3
const BATCH = 50

export async function enqueue(admin: SupabaseClient, items: { userId: string; msg: Message }[], now = new Date()): Promise<void> {
  const expires = new Date(now.getTime() + EXPIRE_HOURS * 3_600_000).toISOString()
  for (const part of chunk(items, 500)) {
    await admin.from('notification_queue')
      .upsert(part.map(i => ({ dedupe_key: i.msg.dedupeKey, user_id: i.userId, msg: i.msg, expires_at: expires })), { onConflict: 'dedupe_key', ignoreDuplicates: true })
  }
}

// Sends what is waiting, oldest first, until the queue is empty or
// `deadline` (epoch ms) passes. Safe to run from two places at once:
// notifyMany drops anything already sent.
export async function drainQueue(admin: SupabaseClient, deadline: number): Promise<NotifyCounts & { expired: number; left: number }> {
  const totals = { sent: 0, duplicate: 0, skipped: 0, expired: 0, left: 0 }
  const { count } = await admin.from('notification_queue').delete({ count: 'exact' }).lt('expires_at', new Date().toISOString())
  totals.expired = count ?? 0

  while (Date.now() < deadline) {
    const { data: rows, error } = await admin.from('notification_queue').select('id, user_id, msg').order('id').limit(BATCH)
    if (error || !rows || rows.length === 0) break
    let counts
    try {
      counts = await notifyMany(admin, rows.map((r: any) => ({ userId: r.user_id, msg: r.msg as Message })))
    } catch (e: any) {
      // Leave the rows where they are; the next run picks them up.
      console.error('[notify-queue] batch failed:', e?.message)
      break
    }
    totals.sent += counts.sent
    totals.duplicate += counts.duplicate
    totals.skipped += counts.skipped
    const { error: delErr } = await admin.from('notification_queue').delete().in('id', rows.map((r: any) => r.id))
    if (delErr || rows.length < BATCH) break
  }
  const { count: left } = await admin.from('notification_queue').select('id', { count: 'exact', head: true })
  totals.left = left ?? 0
  return totals
}
