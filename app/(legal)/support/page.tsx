import type { Metadata } from 'next'
import { LegalPage, Section, LEGAL_CONTACT } from '@/components/legal/Legal'

export const metadata: Metadata = { title: 'Support | MindFit' }

export default function SupportPage() {
  return (
    <LegalPage
      title="Support"
      intro="Questions, a problem with your account, or something that doesn't look right? Here is how to get help."
    >
      <Section title="Contact us">
        <p>Email <a href={`mailto:${LEGAL_CONTACT}`} className="text-cta hover:underline">{LEGAL_CONTACT}</a>. We answer within two business days.</p>
        <p>Include the email on your account and what you were doing when the problem happened. Never send your password.</p>
      </Section>

      <Section title="If you need to talk to someone now">
        <p id="help">MindFit trains mental skills for sport. It is not a crisis service and it is not therapy.</p>
        <ul>
          <li>In the US, call or text <a href="tel:988" className="text-cta hover:underline">988</a> (Suicide &amp; Crisis Lifeline) any time. It is free and confidential.</li>
          <li>Text HOME to <a href="sms:741741" className="text-cta hover:underline">741741</a> to reach the Crisis Text Line.</li>
          <li>If you or someone else is in danger, call 911.</li>
          <li>Talk to a parent, coach, school counselor or another adult you trust.</li>
        </ul>
      </Section>

      <Section title="Common questions">
        <p><strong>I didn&rsquo;t get my sign-in code.</strong> Check spam, then wait a minute and ask for a new one. Codes come from {LEGAL_CONTACT}.</p>
        <p><strong>How do I join my team?</strong> Ask your coach for the team code, then enter it in Settings under your team.</p>
        <p><strong>How do I remove a coach or parent?</strong> Settings shows everyone linked to your account. Remove anyone there and they lose access right away.</p>
        <p><strong>How do I report a name or a message?</strong> Use the Report button next to it. We review reports within 24 hours and remove anything that breaks our rules.</p>
        <p><strong>How do I turn off AI features or notifications?</strong> Both are switches in Settings.</p>
        <p><strong>Who can use MindFit?</strong> Athletes 13 and older, their parents and their coaches.</p>
      </Section>

      <Section title="Delete your account or get your data">
        <p>In the app, open Settings and scroll to &ldquo;Your data&rdquo;. You can download everything you&rsquo;ve logged, or delete your account. Deleting removes your account and your data for good.</p>
        <p>Can&rsquo;t sign in? Email us from the address on the account and we will delete it for you.</p>
      </Section>

      <Section title="Health and safety">
        <p>MindFit is educational. It does not give medical, psychological or nutrition treatment, and it does not replace a doctor, licensed therapist, registered dietitian or athletic trainer. Stop any activity that causes pain. Talk to a parent and a doctor before changing how you eat or starting a supplement.</p>
      </Section>
    </LegalPage>
  )
}
