import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <Image src="/brand/logo-color.png" alt="MindFit" width={140} height={40} className="mx-auto mb-10 h-auto w-[140px]" priority />
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cta mb-3">404</p>
        <h1 className="page-title mb-3">This play isn&apos;t in the playbook.</h1>
        <p className="text-fg-3 text-sm mb-8">
          The page you&apos;re looking for moved or never existed. Reset, refocus, and get back to the work that matters.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/mindset" className="btn-primary">Back to Mindset</Link>
          <Link href="/" className="btn-secondary">Home</Link>
        </div>
      </div>
    </main>
  )
}
