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
          <li><strong>Account:</strong> email, name, sport, role (athlete, coach, parent), and when you accepted these terms.</li>
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
          <li><strong>Google</strong> — only if you choose &ldquo;Continue with Google&rdquo; to sign in.</li>
          <li><strong>Resend</strong> — sends account and invite emails.</li>
          <li><strong>GoHighLevel</strong> — our contact system receives your email and name so we can send you MindFit updates. You can unsubscribe from any email.</li>
          <li><strong>Anthropic</strong> — when you describe a meal in words or generate a training program, that text is sent to Anthropic&rsquo;s AI to be turned into macros or a plan. No other data is sent.</li>
          <li><strong>Open Food Facts</strong> — barcode lookups send the barcode number only.</li>
          <li><strong>Your browser&rsquo;s push service</strong> (Apple, Google, Mozilla) — only if you turn on daily notifications.</li>
          <li><strong>Skool / Zapier</strong> — tells us when a community member joins or leaves so we can link their account.</li>
        </ul>
      </Section>
      <Section title="5. Children and parental consent">
        <p>MindFit is designed for high school athletes and may be used by athletes under 13 with a parent or guardian&rsquo;s involvement. If you are a parent and your child under 13 is using MindFit, you consent to the collection described here by allowing them to use it, and you may review, export or delete their data at any time: use the parent view, or contact us. If we learn that a child under 13 has an account without parental involvement, we will delete it on request from a parent or guardian.</p>
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
