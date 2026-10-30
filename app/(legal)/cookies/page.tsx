import type { Metadata } from 'next'
import { LegalPage, Section, LEGAL_CONTACT } from '@/components/legal/Legal'

export const metadata: Metadata = { title: 'Cookie Policy | MindFit' }

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro="MindFit uses only the cookies and browser storage it needs to keep you signed in and remember your settings. There are no advertising or analytics cookies, so there is nothing to opt out of."
    >
      <Section title="Strictly necessary cookies">
        <ul>
          <li><strong>Sign-in session</strong> (set by Supabase, names begin with <code className="font-mono text-xs">sb-</code>): keeps you signed in between pages. Expires when the session does, or when you sign out.</li>
        </ul>
      </Section>
      <Section title="Browser storage (not cookies)">
        <ul>
          <li><strong>theme</strong>: whether you chose light or dark mode.</li>
          <li><strong>Drafts</strong>: an unfinished workout or form so you do not lose it if the page reloads. Stays on your device only.</li>
          <li><strong>Streak cache</strong>: your current streak, so the flame shows without a reload. Cleared when you close the tab.</li>
        </ul>
        <p>None of this is sent to anyone else and none of it is used to track you across sites.</p>
      </Section>
      <Section title="Third-party cookies">
        <p>If you sign in with Google, Google sets its own cookies on its sign-in page under Google&rsquo;s policy. The MindFit app itself sets no third-party cookies.</p>
      </Section>
      <Section title="Managing cookies">
        <p>You can clear cookies and site data in your browser settings. Clearing the sign-in cookie signs you out; clearing storage resets your theme and removes drafts.</p>
      </Section>
      <Section title="Contact">
        <p><a href={`mailto:${LEGAL_CONTACT}`} className="text-cta hover:underline">{LEGAL_CONTACT}</a></p>
      </Section>
    </LegalPage>
  )
}
