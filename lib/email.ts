export async function sendWelcomeEmail(to: string) {
  if (!process.env.RESEND_API_KEY) return

  await fetch('https://api.resend.com/emails', {
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
          <h2 style="color:#f3f4f6;font-size:20px;font-weight:600;margin:0 0 16px;">You&rsquo;ve been invited</h2>
          <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Your coach has added you to the MindFit athlete development platform. Create your account to start training your mind.
          </p>
          <a href="https://mindfit.academy/signup" style="display:inline-block;background:#C4B400;color:#0A0F1A;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:15px;margin-bottom:32px;">
            Create My Account →
          </a>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:32px 0;" />
          <p style="color:#6b7280;font-size:13px;margin:0 0 12px;">Also join the MindFit community on Skool:</p>
          <a href="https://www.skool.com/mindfit" style="color:#C4B400;font-size:13px;">skool.com/mindfit →</a>
        </div>
      `,
    }),
  })
}
