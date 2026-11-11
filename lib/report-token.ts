import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

// Leaderboard rows carry a sealed user id so a row can be reported without
// any member's real id leaving the server.
const key = () => createHash('sha256').update(`report-token:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`).digest()

export function sealId(userId: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const body = Buffer.concat([cipher.update(userId, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url')
}

export function openId(token: string): string | null {
  try {
    const raw = Buffer.from(token, 'base64url')
    const decipher = createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12))
    decipher.setAuthTag(raw.subarray(12, 28))
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}
