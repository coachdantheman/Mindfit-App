'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { UserRole } from '@/types'

interface NavbarProps {
  email: string
  role: UserRole
}

const tabs = [
  { href: '/mindset', label: 'Mindset', icon: BrainIcon },
  { href: '/nutrition', label: 'Nutrition', icon: NutritionIcon },
  { href: '/exercise', label: 'Exercise', icon: ExerciseIcon },
  { href: '/sleep', label: 'Sleep', icon: SleepIcon },
  { href: '/progress', label: 'Progress', icon: ProgressIcon },
]

export default function Navbar({ email, role }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  const initials = email?.split('@')[0]?.slice(0, 2).toUpperCase() || 'MF'

  return (
    <>
      <nav className="bg-gray-900/80 backdrop-blur border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo lockup */}
            <Link href="/mindset" className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-mindfit-bg flex items-center justify-center ring-1 ring-cta/25 shadow-[0_0_12px_rgba(196,180,0,0.18)]">
                <Image
                  src="/brand/logo-color.png"
                  alt="MindFit"
                  width={24}
                  height={24}
                  priority
                />
              </span>
              <span className="text-gray-100 font-bold text-sm tracking-[0.18em] uppercase hidden sm:inline">
                Mind<span className="text-cta">fit</span>
              </span>
            </Link>

            {/* Desktop tabs with sliding indicator */}
            <div className="hidden sm:flex items-center gap-0.5 relative">
              {tabs.map(tab => {
                const active = isActive(tab.href)
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? 'text-gray-100'
                        : 'text-gray-400 hover:text-gray-100 hover:bg-white/[0.03]'
                    }`}
                  >
                    {tab.label}
                    {active && (
                      <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-cta rounded-full shadow-[0_0_8px_rgba(196,180,0,0.5)]" />
                    )}
                  </Link>
                )
              })}
              {(role === 'admin' || role === 'coach') && (
                <Link
                  href={role === 'admin' ? '/admin' : '/coach'}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/admin') || isActive('/coach')
                      ? 'text-cta'
                      : 'text-gray-400 hover:text-gray-100'
                  }`}
                >
                  {role === 'admin' ? 'Admin' : 'Coach'}
                </Link>
              )}
            </div>

            {/* Right cluster */}
            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                className={`p-1.5 rounded-md transition-colors ${
                  isActive('/settings')
                    ? 'text-cta bg-cta/10'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
                }`}
                title="Settings"
              >
                <SettingsIcon className="w-5 h-5" />
              </Link>
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-mindfit-bg bg-gradient-to-br from-[#e8dc70] to-mindfit-gold hidden sm:flex"
                title={email}
              >
                {initials}
              </span>
              <button
                onClick={signOut}
                className="text-gray-400 hover:text-gray-100 text-xs font-medium transition-colors hidden sm:block"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-white/10 pb-safe">
        <div className="flex items-stretch">
          {tabs.map(tab => {
            const Icon = tab.icon
            const active = isActive(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                  active ? 'text-cta' : 'text-gray-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}

// Icons — stroke 1.75, round, currentColor
function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3a5 5 0 00-4.6 7 4 4 0 002.6 6H9v5h6v-5h2a4 4 0 002.6-6A5 5 0 0015 3z" />
      <path d="M12 3v18" />
    </svg>
  )
}
function NutritionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21c-4 0-7-3-7-7 0-3 2-5 4-6 1 1 2 2 3 2s2-1 3-2c2 1 4 3 4 6 0 4-3 7-7 7z" />
      <path d="M14 6c1-2 1-3 0-4" />
    </svg>
  )
}
function ExerciseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9v6M18 9v6M3 11v2M21 11v2M8 12h8" />
    </svg>
  )
}
function SleepIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 13a9 9 0 11-10-10 7 7 0 0010 10z" />
    </svg>
  )
}
function ProgressIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19h16M6 16V9M11 16V5M16 16v-7M20 16v-4" />
    </svg>
  )
}
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v.1a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
    </svg>
  )
}
