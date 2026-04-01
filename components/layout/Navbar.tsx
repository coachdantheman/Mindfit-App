'use client'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface NavbarProps {
  email: string
  isAdmin: boolean
}

export default function Navbar({ email, isAdmin }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        pathname.startsWith(href)
          ? 'text-cta'
          : 'text-gray-400 hover:text-gray-100'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="bg-gray-900 border-b border-white/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <span className="text-cta font-bold text-lg tracking-widest uppercase">MindFit</span>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navLink('/journal', 'Journal')}
            {navLink('/dashboard', 'Progress')}
            {isAdmin && navLink('/admin', 'Admin')}
          </div>

          {/* User + sign out */}
          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-xs hidden sm:block truncate max-w-[160px]">{email}</span>
            <button
              onClick={signOut}
              className="text-gray-400 hover:text-gray-100 text-sm font-medium transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
