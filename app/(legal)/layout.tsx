import Link from 'next/link'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-surface border-b border-edge">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-cta font-bold text-lg tracking-widest uppercase">MindFit</Link>
          <Link href="/login" className="text-sm text-fg-3 hover:text-fg-1 font-medium">Sign in</Link>
        </div>
      </nav>
      <main id="main" tabIndex={-1} className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
        {children}
      </main>
      <footer className="border-t border-edge">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-4">
          <Link href="/terms" className="hover:text-fg-2">Terms</Link>
          <Link href="/privacy" className="hover:text-fg-2">Privacy</Link>
          <Link href="/cookies" className="hover:text-fg-2">Cookies</Link>
          <span className="ml-auto">© {new Date().getFullYear()} MindFit</span>
        </div>
      </footer>
    </div>
  )
}
