function emailShell(inner: string): string {
  return `
        <div style="background:#0A0F1A;color:#e5e7eb;font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;border-radius:16px;">
          <h1 style="color:#C4B400;font-size:28px;letter-spacing:4px;font-weight:700;margin:0 0 24px;">MINDFIT</h1>
          ${inner}
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:32px 0;" />
          <p style="color:#9ca3af;font-size:13px;margin:0 0 12px;">Also join the MindFit community on Skool:</p>
          <a href="https://www.skool.com/mindfit" style="color:#C4B400;font-size:13px;">skool.com/mindfit →</a>
        </div>
      `
}

async function send(to: string, subject: string, html: string, label: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`${label} skipped: RESEND_API_KEY is not set`)
    return
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Daniel @ MindFit <daniel@mindfit.academy>', to, subject, html }),
  })
  if (!res.ok) console.error(`Failed to send ${label}:`, res.status, await res.text().catch(() => ''))
}

const appUrlOf = () => process.env.NEXT_PUBLIC_APP_URL || 'https://mindfit.academy'

// A coach or admin added this athlete; the account already exists.
export async function sendCoachInviteEmail(to: string, coachName?: string | null, athleteName?: string | null, signInUrl?: string | null) {
  const first = athleteName?.trim().split(/\s+/)[0]
  const coach = coachName?.trim() || 'Your coach'
  const loginUrl = `${appUrlOf()}/login`
  await send(to, `${coach} added you to MindFit`, emailShell(`
          <h2 style="color:#f3f4f6;font-size:20px;font-weight:600;margin:0 0 16px;">${first ? `${first}, your` : 'Your'} account is ready</h2>
          <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 24px;">
            ${coach} added you to the MindFit athlete development platform.${signInUrl
              ? ' Tap the button and you are in &mdash; no password needed.'
              : ' Sign in with this email address to set your password, or use the emailed code.'}
          </p>
          <a href="${signInUrl || loginUrl}" style="display:inline-block;background:#C4B400;color:#0A0F1A;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:15px;margin-bottom:24px;">
            ${signInUrl ? 'Open MindFit →' : 'Sign In →'}
          </a>
          ${signInUrl ? `
          <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 8px;">
            Link expired or not working? Go to <a href="${loginUrl}" style="color:#C4B400;">${loginUrl}</a> and create your account with this email address.
          </p>
          <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
            Set a password any time under Settings so you can sign in without a link.
          </p>` : ''}`), 'coach invite email')
}

// An athlete wants to share progress with this parent.
export async function sendParentInviteEmail(to: string, athleteName?: string | null) {
  const athlete = athleteName?.trim() || 'Your athlete'
  await send(to, `${athlete} wants to share their MindFit progress with you`, emailShell(`
          <h2 style="color:#f3f4f6;font-size:20px;font-weight:600;margin:0 0 16px;">See how ${athlete} is training</h2>
          <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 24px;">
            ${athlete} added you as a parent on MindFit. Create a free account with this email address and you will see their progress, read-only.
          </p>
          <a href="${appUrlOf()}/login" style="display:inline-block;background:#C4B400;color:#0A0F1A;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:15px;margin-bottom:32px;">
            Create Account →
          </a>`), 'parent invite email')
}

export async function sendWelcomeEmail(to: string, name?: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('sendWelcomeEmail skipped: RESEND_API_KEY is not set')
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mindfit.academy'
  const firstName = name?.trim().split(/\s+/)[0]

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Daniel @ MindFit <daniel@mindfit.academy>',
      to,
      subject: "You're in — welcome to MindFit",
      html: `
        <div style="background:#0A0F1A;color:#e5e7eb;font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;border-radius:16px;">
          <h1 style="color:#C4B400;font-size:28px;letter-spacing:4px;font-weight:700;margin:0 0 24px;">MINDFIT</h1>
          <h2 style="color:#f3f4f6;font-size:20px;font-weight:600;margin:0 0 16px;">${firstName ? `${firstName}, you` : 'You'}&rsquo;re in</h2>
          <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 24px;">
            You now have access to the MindFit athlete development platform. Sign in with this email address &mdash; no password needed, we&rsquo;ll send you a code.
          </p>
          <a href="${appUrl}/login" style="display:inline-block;background:#C4B400;color:#0A0F1A;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:15px;margin-bottom:32px;">
            Sign In →
          </a>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:32px 0;" />
          <p style="color:#6b7280;font-size:13px;margin:0 0 12px;">Also join the MindFit community on Skool:</p>
          <a href="https://www.skool.com/mindfit" style="color:#C4B400;font-size:13px;">skool.com/mindfit →</a>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    console.error('Failed to send welcome email:', res.status, await res.text().catch(() => ''))
  }
}
