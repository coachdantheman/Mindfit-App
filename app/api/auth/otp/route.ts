import { NextResponse } from 'next/server'
import { isEmail } from '@/lib/validate'
import { clientIp, rateLimit } from '@/lib/rate-limit'

// Pre-flight for emailed sign-in codes. Same answer for every email so it
// never reveals who has an account; only rate-limits by IP and email.
export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}))
  if (!isEmail(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }
  const normalized = email.toLowerCase().trim()
  const limited =
    (await rateLimit(`otp:ip:${clientIp(req)}`, 10, 3600)) ??
    (await rateLimit(`otp:email:${normalized}`, 5, 3600))
  if (limited) return limited

  return NextResponse.json({ allowed: true, shouldCreateUser: true })
}
