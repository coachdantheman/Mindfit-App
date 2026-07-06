# MindFit App — Launch Checklist (July 2026 upgrade)

Do these in order. Steps 1–2 must happen BEFORE deploying the new code.

## 1. Apply database migrations (in order)
Run in Supabase SQL Editor (project "MF app"), or have Claude apply them:
1. `supabase-migration-v11-auth-access.sql` — security fixes + whitelist enforcement + magic link
2. `supabase-migration-v12-lessons.sql` — Skool lessons table
3. `supabase-migration-v13-mpi-streaks.sql` — baseline MPI, onboarding, coach overview

## 2. Supabase dashboard settings (one-time, ~10 min)
- **Auth → SMTP Settings**: enable Custom SMTP via Resend
  - Host `smtp.resend.com`, Port `465`, User `resend`, Password = your Resend API key
  - Sender: `daniel@mindfit.academy` / "Daniel @ MindFit"
  - REQUIRED — Supabase's built-in email is limited to ~2/hour; magic-link login breaks without this.
- **Auth → Email Templates → Magic Link**: make sure the template includes `{{ .Token }}` so the email shows the 6-digit code. Suggested body: "Your MindFit sign-in code is {{ .Token }} — or click the link below."
- **Auth → Providers → Email**: leave "Confirm email" settings as-is; OTP expiry 1 hour is fine.
- **Auth → Password Security**: enable leaked-password protection (advisor warning).

## 3. Vercel environment variables
Confirm these exist (Settings → Environment Variables):
- `RESEND_API_KEY` — welcome emails silently skip without it
- `NEXT_PUBLIC_APP_URL` — `https://mindfit.academy` (or your app domain)
- `SKOOL_WEBHOOK_SECRET` — NEW. Copy the value from `.env.local` (bottom of file)
- Existing: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`

## 4. Deploy
Push to GitHub → Vercel deploys. Migrations (step 1) must already be applied.

## 5. Zapier — Skool auto-access (~15 min)
1. zapier.com → Create Zap
2. **Trigger**: app "Skool" → event "New Member" → connect your Skool account → community "MindFit Locker Room"
3. **Action**: app "Webhooks by Zapier" → "Custom Request"
   - Method: POST
   - URL: `https://<your-app-domain>/api/webhooks/skool`
   - Data (JSON): `{"event": "member.joined", "name": "<First Name> <Last Name>", "email": "<Email>"}` (insert Skool fields)
   - Headers: `x-skool-secret: <the secret from step 3>` and `Content-Type: application/json`
4. Test with your own alternate email → the email should appear in `/admin` → Manage Access with source "skool", and receive the welcome email.
5. Optional second Zap: trigger "Member Left" → same URL with `"event": "member.left"` (only removes members Skool added; never your manual entries).

## 6. Post-deploy smoke test
- [ ] New whitelisted email → login → "Email me a sign-in code" → code arrives → signs in → onboarding runs → MPI score shows
- [ ] Non-whitelisted email → friendly "no access" message
- [ ] Non-whitelisted Google account → bounced to login with "no access" message
- [ ] Your existing password login still works
- [ ] `/admin` → Lessons tab → add a Skool lesson → card appears in the matching app section and on `/learn`
- [ ] Coach dashboard shows the athlete table (last active, streak, MPI, flags) and CSV export
- [ ] Phone: browser menu → "Add to Home Screen" → MindFit installs as an app

## Webhook test command
```bash
curl -X POST https://<your-app-domain>/api/webhooks/skool \
  -H "x-skool-secret: <secret>" -H "Content-Type: application/json" \
  -d '{"event":"member.joined","name":"Test User","email":"you+test@gmail.com"}'
```
Expect `{"ok":true,"action":"whitelisted"}`.
