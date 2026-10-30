import { createAdminClient } from '@/lib/supabase-server'
import { pushGhlEvent } from '@/lib/ghl'

const PHOTO_BUCKET = 'progress-photos'

// Removes everything the app holds for a user. Storage objects first
// (no cascade covers them), then the auth user, which cascades through
// profiles into every per-user table.
export async function deleteUserCompletely(userId: string): Promise<{ photosRemoved: number }> {
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('email, full_name').eq('id', userId).maybeSingle()

  let photosRemoved = 0
  const { data: photos } = await admin.from('progress_photos').select('storage_path').eq('user_id', userId)
  const paths = (photos ?? []).map(p => p.storage_path).filter(Boolean)
  for (let i = 0; i < paths.length; i += 100) {
    const { data, error } = await admin.storage.from(PHOTO_BUCKET).remove(paths.slice(i, i + 100))
    if (error) console.error('progress photo cleanup failed:', error.message)
    else photosRemoved += data?.length ?? 0
  }

  if (profile?.email) {
    const email = profile.email.toLowerCase()
    await Promise.all([
      admin.from('pending_links').delete().or(`requester_id.eq.${userId},email.eq.${email}`),
      admin.from('approved_emails').delete().eq('email', email),
    ])
    void pushGhlEvent({ email, name: profile.full_name }, 'account_deleted')
  }

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)
  return { photosRemoved }
}

export async function isLastAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('id').eq('role', 'admin')
  const admins = (data ?? []).map(r => r.id)
  return admins.length <= 1 && admins.includes(userId)
}
