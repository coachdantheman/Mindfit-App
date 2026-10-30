import type { Metadata } from 'next'
import { LegalPage, Section, LEGAL_CONTACT } from '@/components/legal/Legal'

export const metadata: Metadata = { title: 'Terms of Service | MindFit' }

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms govern your use of the MindFit app and website. By creating an account or using the app you agree to them. If you are under 18, a parent or guardian must agree on your behalf."
    >
      <Section title="1. What MindFit is">
        <p>MindFit is a mental skills and athlete development tool: journaling, assessments, nutrition and training logs, sleep tracking, and coaching features for athletes, their parents and their coaches.</p>
        <p>MindFit is educational. It is not medical, psychological, nutritional or dietary treatment, and it does not replace advice from a doctor, licensed therapist, registered dietitian or athletic trainer. Stop any activity that causes pain, and seek professional help for any mental health concern.</p>
      </Section>
      <Section title="2. Accounts">
        <ul>
          <li>You must give accurate information and keep your sign-in details private.</li>
          <li>A coach may create an account for an athlete on their roster. The athlete (or their parent) claims it at first sign-in and can remove the coach link at any time in Settings.</li>
          <li>You are responsible for activity under your account. Tell us at once if you think it has been accessed without permission.</li>
        </ul>
      </Section>
      <Section title="3. Young athletes and parents">
        <p>MindFit is built for high school athletes, so we expect many users to be under 18. Parents and guardians can see an athlete&rsquo;s progress only when the athlete shares it from Settings, and the athlete can stop sharing at any time. For users under 13, a parent or guardian must set up and supervise the account. See the Privacy Policy for how we handle children&rsquo;s data.</p>
      </Section>
      <Section title="4. Acceptable use">
        <ul>
          <li>Do not use MindFit to harass, bully or harm anyone, or to upload content you have no right to share.</li>
          <li>Do not try to access another user&rsquo;s data, probe or overload our systems, or copy the app or its content for resale.</li>
          <li>Coaches and parents may use the data they can see only to support the athlete.</li>
        </ul>
      </Section>
      <Section title="5. Your content">
        <p>You own what you enter into MindFit: journal entries, logs, photos, notes. You give us permission to store and process it so the app works, including showing it to the coaches and parents you have linked. We do not sell your content.</p>
      </Section>
      <Section title="6. Our content">
        <p>The MindFit name, logo, course material, guides, and app design belong to MindFit and may not be copied or redistributed without permission.</p>
      </Section>
      <Section title="7. Community and paid programs">
        <p>Coaching, courses and community access are offered through the MindFit Skool community under Skool&rsquo;s own terms and billing. Those purchases are governed by the terms shown at checkout.</p>
      </Section>
      <Section title="8. Ending your account">
        <p>You can delete your account and all of your data at any time from Settings. We may suspend or close accounts that break these terms. Sections that by their nature should survive (ownership, disclaimers, limitation of liability) continue after closure.</p>
      </Section>
      <Section title="9. Disclaimers and limitation of liability">
        <p>MindFit is provided &ldquo;as is&rdquo;. To the fullest extent the law allows, we are not liable for indirect, incidental or consequential damages, or for injury that results from training, nutrition or recovery decisions you make. Our total liability for any claim is limited to the amount you paid us in the twelve months before the claim, or $50 if you paid nothing.</p>
      </Section>
      <Section title="10. Changes">
        <p>We may update these terms. When changes are material we will show a notice in the app and ask you to accept again. Continued use after that means you agree to the new terms.</p>
      </Section>
      <Section title="11. Contact">
        <p>Questions about these terms: <a href={`mailto:${LEGAL_CONTACT}`} className="text-cta hover:underline">{LEGAL_CONTACT}</a>.</p>
      </Section>
    </LegalPage>
  )
}
