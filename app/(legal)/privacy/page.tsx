import type { Metadata } from 'next'
import { LegalPage, Section, LEGAL_CONTACT } from '@/components/legal/Legal'

export const metadata: Metadata = { title: 'Privacy Policy | MindFit' }

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This policy explains what MindFit collects, why, who can see it, and the choices you have. We keep it short on purpose; if anything is unclear, email us."
    >
      <Section title="1. What we collect">
        <ul>
          <li><strong>Account:</strong> email, name, sport, birth month and year, role (athlete, coach, parent), and when you accepted these terms.</li>
          <li><strong>What you log:</strong> daily journal entries and ratings (motivation, focus, confidence, anxiety), weekly assessments, flow state sessions, affirmations and goals, meals and macros, weigh-ins, progress photos, workouts and sets, sleep and recovery.</li>
          <li><strong>Game and schedule info:</strong> your next competition date and start time.</li>
          <li><strong>Technical:</strong> a sign-in session cookie, and small settings stored in your browser (theme, unsaved drafts). We do not run analytics or advertising trackers.</li>
        </ul>
      </Section>
      <Section title="2. Why we use it">
        <ul>
          <li>To run the app: show your progress, compute streaks and scores, build your fueling plan.</li>
          <li>To show your progress to the coaches and parents you are linked to.</li>
          <li>To send account emails (welcome, invites) and, if you opted in, daily notifications.</li>
          <li>To keep MindFit secure and fix problems.</li>
        </ul>
        <p>We do not sell personal data and do not use it for third-party advertising.</p>
      </Section>
      <Section title="3. Who can see your data">
        <ul>
          <li><strong>You.</strong></li>
          <li><strong>Coaches</strong> linked to your account see your journal, assessments, flow data, nutrition, workouts, sleep and goals. They do not see weigh-ins or progress photos. You can remove a coach in Settings.</li>
          <li><strong>Parents</strong> you share with see the same, read-only. You can stop sharing in Settings.</li>
          <li><strong>MindFit staff</strong> (admin) can see account data to run the service and support you.</li>
        </ul>
      </Section>
      <Section title="4. Services that process data for us">
        <ul>
          <li><strong>Supabase</strong> — database, file storage and sign-in (hosting all app data).</li>
          <li><strong>Vercel</strong> — hosts the app.</li>
          <li><strong>Resend</strong> — sends account, invite and parent permission emails.</li>
          <li><strong>Our contact system</strong> (currently GoHighLevel) — may receive your email and name so we can send you MindFit updates. You can unsubscribe from any email. Athletes under 13 are never added to it.</li>
          <li><strong>Anthropic</strong> — when you describe a meal in words or generate a training program, that text is sent to Anthropic&rsquo;s AI to be turned into macros or a plan. No name, email or other data is sent. For athletes under 13 this happens only if a parent allowed AI features.</li>
          <li><strong>Open Food Facts</strong> — barcode lookups send the barcode number only.</li>
          <li><strong>Your browser&rsquo;s push service</strong> (Apple, Google, Mozilla) — only if you turn on daily notifications.</li>
          <li><strong>Skool / Zapier</strong> — tells us when a community member joins or leaves so we can link their account.</li>
        </ul>
      </Section>
      <Section title="5. Children and parental consent">
        <p>Every athlete is asked for their birth month and year. If an athlete is under 13, the account is locked until a parent or legal guardian gives permission. Before that, we hold only the child&rsquo;s name, email, birth month and year, and the parent email they give us, and we use the parent email only to ask for permission.</p>
        <p>We email the parent a notice explaining what we collect and how it is used, with a link to a signed online permission form. The parent decides separately whether coaches can see the child&rsquo;s logs, whether AI features can be used, and whether the child&rsquo;s first name appears on the leaderboard. Progress photos are not available to athletes under 13.</p>
        <p>If the parent declines, or does not respond within 14 days, we delete the account and everything collected, including the parent&rsquo;s email. A parent can review their child&rsquo;s information, change their choices, or withdraw permission and have everything deleted at any time, using the link in our email or by contacting us.</p>
        <p>Athletes aged 13 to 17 can use MindFit with their own agreement and can choose to share their progress with a parent from Settings.</p>
      </Section>
      <Section title="6. How long we keep it">
        <p>For as long as your account exists. When you delete your account, everything is removed immediately: profile, logs, photos and sign-in. Backups held by our hosting provider expire on their normal schedule (typically within 30 days).</p>
      </Section>
      <Section title="7. Your rights and choices">
        <ul>
          <li><strong>Export</strong> a complete copy of your data from Settings → Your data.</li>
          <li><strong>Delete</strong> your account and all data from Settings → Your data, or email us and we will do it within 7 days.</li>
          <li><strong>Correct</strong> your name, sports and game details from Settings.</li>
          <li><strong>Control sharing:</strong> remove any coach or parent from Settings → Sharing.</li>
          <li><strong>Notifications:</strong> turn daily notifications off in Settings; unsubscribe from emails with the link in any email.</li>
        </ul>
        <p>Depending on where you live (for example the EU, UK or California) you may have additional rights to access, correct, restrict or object. Email us to exercise them.</p>
      </Section>
      <Section title="8. Security">
        <p>Data is encrypted in transit and at rest with our hosting provider. Access is limited by role: athletes see their own data, coaches and parents only what has been linked to them. Progress photos are stored privately and served through short-lived links.</p>
      </Section>
      <Section title="9. Changes">
        <p>We will post updates here and, for material changes, show a notice in the app.</p>
      </Section>
      <Section title="10. Contact">
        <p>Privacy questions or requests: <a href={`mailto:${LEGAL_CONTACT}`} className="text-cta hover:underline">{LEGAL_CONTACT}</a>.</p>
      </Section>
    </LegalPage>
  )
}
