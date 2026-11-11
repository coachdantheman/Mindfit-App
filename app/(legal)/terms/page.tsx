import type { Metadata } from 'next'
import { LegalPage, Section, WhoWeAre, LEGAL_CONTACT } from '@/components/legal/Legal'

export const metadata: Metadata = { title: 'Terms of Service | MindFit' }

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms govern your use of the MindFit app and website. By creating an account or using the app you agree to them. You must be 13 or older to use MindFit."
    >
      <Section title="1. What MindFit is">
        <WhoWeAre />
        <p>MindFit is a mental skills and athlete development tool: journaling, assessments, nutrition and training logs, sleep tracking, and coaching features for athletes, their parents and their coaches.</p>
        <p>MindFit is educational. It is not medical, psychological, nutritional or dietary treatment, and it does not replace advice from a doctor, licensed therapist, registered dietitian or athletic trainer. Stop any activity that causes pain. Talk to a parent and a doctor before changing how you eat or starting a supplement. MindFit is not a crisis service: if you are in danger or thinking about hurting yourself, call or text 988, or call 911.</p>
      </Section>
      <Section title="2. Accounts">
        <ul>
          <li>You must give accurate information and keep your sign-in details private.</li>
          <li>A coach may create an account for an athlete on their roster. The athlete (or their parent) claims it at first sign-in and can remove the coach link at any time in Settings.</li>
          <li>You are responsible for activity under your account. Tell us at once if you think it has been accessed without permission.</li>
        </ul>
      </Section>
      <Section title="3. Young athletes and parents">
        <p>MindFit is built for high school athletes, so we expect many users to be under 18. Athletes 13 and older agree to these terms themselves. Parents and guardians can see an athlete&rsquo;s progress only when the athlete shares it from Settings, and the athlete can stop sharing at any time.</p>
        <p>MindFit is not for children under 13. An account created with an under-13 birth date is deleted. If you are under 18, make sure a parent or guardian knows you use MindFit and is comfortable with these terms.</p>
      </Section>
      <Section title="4. Acceptable use">
        <ul>
          <li>Do not use MindFit to harass, bully or harm anyone, or to upload content you have no right to share.</li>
          <li>We do not tolerate offensive, hateful or sexual content, including in leaderboard names, team names and coach notes. Use the Report button on any name or note that breaks this rule. We review reports within 24 hours, remove the content and may close the account behind it.</li>
          <li>Athletes can remove a coach or parent at any time in Settings, which ends that person&rsquo;s access.</li>
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
      <Section title="7. AI features">
        <p>Some features use AI to estimate nutrition, build a training plan or read a schedule. They are optional and ask for your permission first. AI results are estimates and can be wrong. Check them before you rely on them, and do not treat them as medical or nutrition advice.</p>
      </Section>
      <Section title="8. Price and team access">
        <p>The MindFit app is free to download and use. Teams, schools and clubs can arrange access for their athletes directly with MindFit under a separate written agreement. Any other MindFit program is governed by the terms shown where it is offered.</p>
      </Section>
      <Section title="9. Ending your account">
        <p>You can delete your account and all of your data at any time from Settings. We may suspend or close accounts that break these terms. Sections that by their nature should survive (ownership, disclaimers, limitation of liability) continue after closure.</p>
      </Section>
      <Section title="10. Disclaimers and limitation of liability">
        <p>MindFit is provided &ldquo;as is&rdquo;. To the fullest extent the law allows, we are not liable for indirect, incidental or consequential damages, or for injury that results from training, nutrition or recovery decisions you make. Our total liability for any claim is limited to the amount you paid us in the twelve months before the claim, or $50 if you paid nothing.</p>
      </Section>
      <Section title="11. Changes">
        <p>We may update these terms. When changes are material we will show a notice in the app and ask you to accept again. Continued use after that means you agree to the new terms.</p>
      </Section>
      <Section title="12. Contact">
        <p>Questions about these terms: <a href={`mailto:${LEGAL_CONTACT}`} className="text-cta hover:underline">{LEGAL_CONTACT}</a>.</p>
      </Section>
    </LegalPage>
  )
}
