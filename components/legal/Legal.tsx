export const LEGAL_UPDATED = 'November 11, 2026'
export const LEGAL_CONTACT = 'daniel@mindfit.academy'
// Registered company name and mailing address. Shown in the policies once set.
export const LEGAL_ENTITY: string | null = 'MindFit LLC'
export const LEGAL_ADDRESS: string | null = '445 E 300 S, Pleasant Grove, UT 84062'

export function WhoWeAre() {
  return (
    <p>
      MindFit is operated by {LEGAL_ENTITY ?? 'MindFit'} (&ldquo;MindFit&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;).
      {LEGAL_ADDRESS && <> Mailing address: {LEGAL_ADDRESS}.</>}
      {' '}Contact: <a href={`mailto:${LEGAL_CONTACT}`} className="text-cta hover:underline">{LEGAL_CONTACT}</a>.
    </p>
  )
}

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="page-title">{title}</h1>
        <p className="text-sm text-fg-4 mt-1">Last updated {LEGAL_UPDATED}</p>
        <p className="text-fg-2 mt-4">{intro}</p>
      </header>
      {children}
    </article>
  )
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-fg-1">{title}</h2>
      <div className="text-sm text-fg-2 leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">{children}</div>
    </section>
  )
}
