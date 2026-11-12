# MindFit security

Last reviewed: 2026-11-11. Covers the app as of migration v51.

## How access is enforced

1. **API routes** check the session on every call (`lib/api-auth.ts` `verifyApiUser`), then the role, then that the caller owns or is linked to the data. They talk to the database with the service-role key, so this check is the main gate.
2. **Row-level security (RLS)** on every table is the second gate. If a route had a bug, the public anon key still could not read another user's rows.
3. **Pages** are protected by `proxy.ts` (signed-out users are sent to `/`) and by role checks in each layout (`app/coach/layout.tsx`, `app/admin`, `app/parent/layout.tsx`).

## Roles

| Role | How someone gets it |
|---|---|
| Athlete (`member`) | Default at signup |
| Parent (`parent`) | Signing up from a parent invite email, or accepting a parent invite in the app (v50) |
| Coach (`coach`) | Only an admin can set it (Admin → Coaches) |
| Admin (`admin`) | Set directly in the database |
| Anonymous | Not signed in |

## Access control matrix

"Linked" means the athlete accepted the coach (`coach_athletes`) or the parent accepted the athlete's invite (`parent_athletes`). Under-13 athletes share with coaches only if their parent allowed it in the consent form.

| Data | Athlete | Coach | Parent | Admin | Anonymous |
|---|---|---|---|---|---|
| Own profile | Read, edit safe fields | Own | Own | Read all | None |
| Journal, check-ins, gratitude | Own: full | Read linked | Read linked | Read all | None |
| Workouts, practices, plans | Own: full | Read linked, assign plans | Read linked | Read all | None |
| Nutrition, sleep, recovery | Own: full | Read linked | Read linked | Read all | None |
| Weigh-ins, progress photos | Own: full | None | None | None | None |
| Flow State sessions and logs | Own: full | Read linked, write coach notes | Read linked | Read all | None |
| Goals, habits | Own: full | Read linked | Read linked | Read all | None |
| Weekly MPI | Own | Read linked | Read linked | Full | None |
| Quiz results, lesson completions | Own | Read linked (quiz) | None | None | None |
| Teams, team goals | See own teams' goal totals | Manage own teams | None | All | None |
| Board (leaderboard) | Name, sport, level, points only (opt out in Settings) | Same | Hidden | Same | None |
| Reports (flagged names) | Create | Create | Create | Read, resolve | None |
| Rate limits, notifications, invites, consent records | Server only | Server only | Server only | Server only | None |

Athletes can remove any coach or parent at any time (Settings → My people). Nothing is shared with a coach or a parent who already has an account until they accept.

## Protections in place

- **SQL injection:** every query uses the Supabase query builder or a database function with named parameters. No SQL is built from strings in app code. The one admin search that builds a filter escapes and quotes its input. To check: `grep -rn "\.or(\`\|\.filter(\`" app lib` should only show filters built from the signed-in user's own id.
- **Rate limiting:**
  - Every signed-in API call: 240 a minute per user (`lib/api-auth.ts`).
  - Sign-in codes, signup, parent consent: per IP and per email, and these fail closed if the limiter's database is down.
  - Public routes (quote, quote image, health, unsubscribe, Skool webhook, sign-in links): per IP.
  - Skool webhook: one welcome email per address per day.
  - AI features: 30 calls per user per day.
- **Input validation:** write routes type-check and length-cap every field and pick fields explicitly before saving (`lib/validate.ts`).
- **API keys:** secrets live only in Vercel environment variables. Only the Supabase URL and anon key, Sentry DSN, push public key and app URL are exposed to the browser, and all of those are designed to be public. `.env.local` is git-ignored.
- **Headers:** strict Content Security Policy, no framing, HSTS, nosniff, referrer policy (`next.config.js`).
- **Webhooks and crons:** shared secrets compared in constant time.

## Still open (owner actions)

1. Supabase dashboard → Authentication: turn off "Allow new users to sign up" (the app has its own signup) and turn on "Prevent use of leaked passwords".
2. Attorney: confirm the COPPA parental consent method.
3. Rotate any key that was ever pasted into a chat or document.
4. Later: CSP nonces to remove `'unsafe-inline'` from `script-src`; merge the duplicate RLS policies Supabase flags; retire the old unsubscribe signing fallback in `lib/unsubscribe.ts` once links sent before `UNSUBSCRIBE_SECRET` existed have expired.
