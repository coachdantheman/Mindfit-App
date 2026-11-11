import type { Metadata } from 'next'
import { LegalPage, Section, WhoWeAre, LEGAL_CONTACT } from '@/components/legal/Legal'

export const metadata: Metadata = { title: 'Privacy Policy | MindFit' }

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This policy explains what MindFit collects, why, who can see it, and the choices you have. It covers the MindFit app and website. If anything is unclear, email us."
    >
      <Section title="1. Who we are">
        <WhoWeAre />
        <p>MindFit is for athletes aged 13 and older, their parents and their coaches.</p>
      </Section>
      <Section title="2. What we collect">
        <ul>
          <li><strong>Account:</strong> email, name, role (athlete, coach, parent), sports, birth month and year, the date you accepted our terms, and your choices about sharing, notifications and AI features.</li>
          <li><strong>Mindset logs:</strong> daily journal entries and ratings (motivation, focus, confidence, anxiety), weekly assessments, quiz answers and results, flow state sessions and cue words, visualization, meditation and gratitude entries, affirmations and goals.</li>
          <li><strong>Body and health logs:</strong> bodyweight and weigh-ins, sex and age (used for calorie targets and strength standards), goal weight, calorie and macro targets, meals and foods, supplements you choose to track, sleep and recovery entries, and progress photos if you add them.</li>
          <li><strong>Training logs:</strong> workouts, sets, runs, practices, saved workouts and training programs.</li>
          <li><strong>Habits and schedule:</strong> habits you track, your games and events, and your next competition date and time.</li>
          <li><strong>Team and leaderboard:</strong> the teams you join, who you are linked to, and your leaderboard name and points if you choose to appear on it.</li>
          <li><strong>Reports:</strong> if you report a leaderboard name or a coach note, we keep your report and a copy of what you reported so we can review it.</li>
          <li><strong>Technical:</strong> a sign-in session cookie, small settings stored on your device (theme, unsaved drafts), the time you last used the app, your time zone, and a record of notifications sent to you (kept up to 120 days). To stop abuse we keep short-lived counters keyed to your account, IP address or email (deleted within 2 days).</li>
        </ul>
        <p>We do not run analytics or advertising trackers, and we do not track you across other apps or websites.</p>
      </Section>
      <Section title="3. Why we use it">
        <ul>
          <li>To run the app: show your progress, compute streaks and scores, and build your fueling plan.</li>
          <li>To show your progress to the coaches and parents you are linked to.</li>
          <li>To send account emails (welcome, sign-in codes, invites) and progress emails (level-ups, a weekly recap, updates from your coach). Every progress email has a one-click unsubscribe link.</li>
          <li>To send notifications you can turn on or off by type in Settings. Scheduled notifications are not sent between 9 pm and 7 am in your time zone.</li>
          <li>To review reports, keep MindFit safe and fix problems.</li>
        </ul>
        <p>We do not sell personal data, share it for advertising, or use it to train AI models.</p>
      </Section>
      <Section title="4. Who can see your data">
        <ul>
          <li><strong>You.</strong></li>
          <li><strong>Coaches</strong> you connect with see your journal, assessments, flow data, nutrition, workouts, sleep and goals. You connect with a coach by entering their team code, by creating your account from their email invite, or by accepting their request in the app. A coach who invites an existing account sees nothing until you accept. Coaches do not see weigh-ins or progress photos. You can remove a coach in Settings.</li>
          <li><strong>Parents</strong> you share with see the same, read-only. You can stop sharing in Settings.</li>
          <li><strong>Other athletes</strong> see only your leaderboard name and points, and only if you turn the leaderboard on.</li>
          <li><strong>MindFit staff</strong> can see account data to run the service, review reports and support you.</li>
        </ul>
      </Section>
      <Section title="5. Services that process data for us">
        <ul>
          <li><strong>Supabase</strong>: database, file storage and sign-in. It hosts all app data.</li>
          <li><strong>Vercel</strong>: hosts the app.</li>
          <li><strong>Resend</strong>: sends our emails.</li>
          <li><strong>Anthropic</strong>: powers the optional AI features. See section 6.</li>
          <li><strong>GoHighLevel</strong> (our contact system): receives the email and name of adult users only (coaches, parents, and athletes 18 or older) so we can send MindFit updates. Athletes under 18 are never added. You can unsubscribe from any email, and deleting your account removes you from it.</li>
          <li><strong>Open Food Facts</strong>: barcode lookups send the barcode number only.</li>
          <li><strong>Push notification services</strong> (Apple, Google, Mozilla): only if you turn on notifications. They receive the notification text, not your logs.</li>
          <li><strong>Skool and Zapier</strong>: tell us when a MindFit community member joins or leaves, so we can link their account.</li>
        </ul>
      </Section>
      <Section title="6. AI features">
        <p>AI features are optional. The first time you use one, the app asks for your permission and shows what will be sent. You can turn AI features off again in Settings.</p>
        <ul>
          <li>When you describe a meal or ask for a nutrition estimate, the text you type and the details needed for the estimate are sent to Anthropic&rsquo;s Claude.</li>
          <li>When you ask for an AI training plan, your sport, goals and training details are sent.</li>
          <li>When a coach uploads a season schedule, that file is sent to read the dates. It may include names printed on it.</li>
        </ul>
        <p>Your name and email are not sent with meal or plan requests. Anthropic processes this data to return a result and does not use it to train its models under its commercial terms.</p>
      </Section>
      <Section title="7. Children">
        <p>MindFit is not for children under 13, and we do not knowingly collect their personal information. Every new account is asked for a birth month and year. If the answer shows the person is under 13, the account and everything in it is deleted right away. A small marker stays on that device so the question can&rsquo;t simply be answered again.</p>
        <p>If you believe a child under 13 has an account, email us and we will delete it.</p>
        <p>Athletes aged 13 to 17 use MindFit with their own agreement. They choose whether to share progress with a parent, are not added to our contact system, and are not shown supplement suggestions.</p>
      </Section>
      <Section title="8. How long we keep it">
        <p>For as long as your account exists. When you delete your account, everything is removed right away: profile, logs, photos and sign-in. Notification records are kept up to 120 days and abuse counters up to 2 days. Backups held by our hosting provider expire on their normal schedule (typically within 30 days).</p>
      </Section>
      <Section title="9. Your rights and choices">
        <ul>
          <li><strong>Export</strong> a copy of your data from Settings → Your data.</li>
          <li><strong>Delete</strong> your account and all data from Settings → Your data, or email us and we will do it within 7 days.</li>
          <li><strong>Correct</strong> your name, sports and game details from Settings.</li>
          <li><strong>Control sharing:</strong> remove any coach or parent from Settings → Sharing, and turn the leaderboard on or off.</li>
          <li><strong>AI features:</strong> turn them on or off in Settings.</li>
          <li><strong>Notifications:</strong> choose which notifications and emails you get in Settings → Notifications, or unsubscribe with the link in any progress email.</li>
        </ul>
        <p>Depending on where you live (for example the EU, UK, California or Washington) you may have more rights to access, correct, delete, restrict or object, and to withdraw consent for health-related data. Email us to use them. We will not treat you differently for doing so.</p>
      </Section>
      <Section title="10. Security">
        <p>Data is encrypted in transit and at rest with our hosting provider. Access is limited by role: athletes see their own data, coaches and parents only what has been linked to them. Progress photos are stored privately and served through short-lived links. No system is perfectly secure; if a breach affects your data we will tell you as the law requires.</p>
      </Section>
      <Section title="11. Changes">
        <p>We will post updates here and, for material changes, show a notice in the app.</p>
      </Section>
      <Section title="12. Contact">
        <p>Privacy questions or requests: <a href={`mailto:${LEGAL_CONTACT}`} className="text-cta hover:underline">{LEGAL_CONTACT}</a>.</p>
      </Section>
    </LegalPage>
  )
}
