import { LEGAL_CONTACT, Section } from '@/components/legal/Legal'

// COPPA online notice shown to the parent before they decide. Changing
// this text means bumping NOTICE_VERSION in lib/consent.ts.
export default function ParentNotice({ childName }: { childName: string }) {
  return (
    <div className="space-y-6">
      <Section title="Who we are">
        <p>
          MindFit is a mental performance training app for young athletes, operated by MindFit (a Utah LLC) and Daniel Jacobsen,
          a mental performance coach. Contact: {LEGAL_CONTACT}, Pleasant Grove, Utah.
        </p>
      </Section>

      <Section title="What we would collect from your child">
        <ul>
          <li>Account details: name, email, sport, birth month and year.</li>
          <li>What they log: journal entries, daily ratings (motivation, focus, confidence, anxiety), weekly assessments and their Mental Performance Index, flow sessions, goals and affirmations, gratitude entries.</li>
          <li>Training and health logs: meals and macros, weigh-ins, workouts, runs, practice logs, sleep and recovery.</li>
          <li>A sign-in session cookie. We run no analytics or advertising trackers.</li>
        </ul>
        <p>Progress photos are turned off for every athlete under 13.</p>
      </Section>

      <Section title="How we use it">
        <ul>
          <li>To run the app for {childName}: show progress, streaks and scores, and build training and fueling plans.</li>
          <li>To send account emails. We never send your child marketing email.</li>
          <li>We do not sell your child&rsquo;s information, do not use it for advertising, and do not use it to train AI models.</li>
        </ul>
      </Section>

      <Section title="Who can see it">
        <ul>
          <li>You, read-only, through a free parent account.</li>
          <li>Coaches your child is linked to, only if you allow it below. Coaches see journal, ratings, assessments, nutrition, workouts, sleep and goals, never weigh-ins.</li>
          <li>Other athletes see your child&rsquo;s first name, sport and points on the leaderboard only if you allow it below.</li>
          <li>MindFit staff, to run the service and support you.</li>
          <li>Service providers that host or process data for us under contract: Supabase (database and sign-in), Vercel (hosting), Resend (account email), and, only if you allow AI features below, Anthropic (turns a typed meal description or training request into nutrition or a plan; no name or email is sent).</li>
        </ul>
      </Section>

      <Section title="Your rights">
        <ul>
          <li>You can agree to collection and use without agreeing to coach sharing, AI features or the leaderboard.</li>
          <li>You can review your child&rsquo;s information, change your choices, or withdraw consent and have everything deleted at any time, using the link in your email or by writing to {LEGAL_CONTACT}.</li>
          <li>We keep your child&rsquo;s information only while the account exists. Deleting it removes everything right away; hosting backups expire within about 30 days.</li>
          <li>If you decline, or do not respond within 14 days, we delete everything we hold, including your email address.</li>
        </ul>
        <p>Full details are in our <a className="text-cta underline" href="/privacy">Privacy Policy</a>.</p>
      </Section>
    </div>
  )
}
