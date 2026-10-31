'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { UserRole } from '@/types'

function StreakChip({ pathname }: { pathname: string }) {
  const [streak, setStreak] = useState<number | null>(null)

  // Re-check on every navigation (throttled) so a fresh log lights the
  // flame right away instead of on the next visit.
  useEffect(() => {
    let cached: { streak: number; ts: number } | null = null
    try { cached = JSON.parse(sessionStorage.getItem('mf_streak') ?? 'null') } catch {}
    if (cached && typeof cached.streak === 'number') setStreak(cached.streak)
    if (cached && Date.now() - cached.ts < 60_000) return
    fetch('/api/stats/overview')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data && typeof data.streak === 'number') {
          setStreak(data.streak)
          sessionStorage.setItem('mf_streak', JSON.stringify({ streak: data.streak, ts: Date.now() }))
        }
      })
      .catch(() => {})
  }, [pathname])

  if (!streak) return null
  return (
    <Link
      href="/progress"
      className="flex items-center gap-1 px-2.5 py-1.5 sm:px-2 sm:py-1 rounded-full bg-cta/10 text-cta text-xs font-semibold tabular-nums"
      title={`${streak}-day training streak`}
    >
      🔥 {streak}
    </Link>
  )
}

interface NavbarProps {
  email: string
  role: UserRole
  fullName?: string | null
}

function computeInitials(fullName: string | null | undefined, email: string): string {
  const name = fullName?.trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  }
  const prefix = email?.split('@')[0]
  return prefix ? prefix.slice(0, 2).toUpperCase() : 'MF'
}

const tabs = [
  { href: '/mindset', label: 'Mindset', icon: BrainIcon },
  { href: '/nutrition', label: 'Nutrition', icon: NutritionIcon },
  { href: '/exercise', label: 'Exercise', icon: ExerciseIcon },
  { href: '/sleep', label: 'Sleep', icon: SleepIcon },
  { href: '/progress', label: 'Progress', icon: ProgressIcon },
  { href: '/learn', label: 'Learn', icon: LearnIcon },
  { href: '/leaderboard', label: 'Board', icon: TrophyIcon },
]

export default function Navbar({ email, role, fullName }: NavbarProps) {
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

  const initials = computeInitials(fullName, email)
  const roleLink =
    role === 'admin' ? { href: '/admin', label: 'Admin' } :
    role === 'coach' ? { href: '/coach', label: 'Coach' } :
    role === 'parent' ? { href: '/parent', label: 'My Athletes' } :
    null

  return (
    <>
      <nav className="bg-surface/80 backdrop-blur border-b border-edge pt-safe">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo lockup */}
            <Link href="/mindset" className="flex items-center gap-2.5">
              <span className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg bg-page flex items-center justify-center ring-1 ring-cta/25 shadow-[0_0_12px_rgba(196,180,0,0.18)]">
                <Image
                  src="/brand/logo-color.png"
                  alt="MindFit"
                  width={24}
                  height={24}
                  priority
                />
              </span>
              <span className="text-fg-1 font-bold text-sm tracking-[0.18em] uppercase hidden sm:inline">
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
                    aria-current={active ? 'page' : undefined}
                    className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? 'text-fg-1'
                        : 'text-fg-3 hover:text-fg-1 hover:bg-surface-2/60'
                    }`}
                  >
                    {tab.label}
                    {active && (
                      <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-cta rounded-full shadow-[0_0_8px_rgba(196,180,0,0.5)]" />
                    )}
                  </Link>
                )
              })}
              {roleLink && (
                <Link
                  href={roleLink.href}
                  aria-current={isActive(roleLink.href) ? 'page' : undefined}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(roleLink.href)
                      ? 'text-cta'
                      : 'text-fg-3 hover:text-fg-1'
                  }`}
                >
                  {roleLink.label}
                </Link>
              )}
            </div>

            {/* Right cluster */}
            <div className="flex items-center gap-2">
              <StreakChip pathname={pathname} />
              {roleLink && (
                <Link
                  href={roleLink.href}
                  aria-current={isActive(roleLink.href) ? 'page' : undefined}
                  className={`sm:hidden p-2.5 rounded-md transition-colors ${
                    isActive(roleLink.href)
                      ? 'text-cta bg-cta/10'
                      : 'text-fg-3 hover:text-fg-1 hover:bg-surface-2'
                  }`}
                  title={roleLink.label}
                  aria-label={roleLink.label}
                >
                  <ShieldIcon className="w-5 h-5" />
                </Link>
              )}
              <Link
                href="/settings"
                className={`p-2.5 sm:p-1.5 rounded-md transition-colors ${
                  isActive('/settings')
                    ? 'text-cta bg-cta/10'
                    : 'text-fg-3 hover:text-fg-1 hover:bg-surface-2'
                }`}
                title="Settings"
                aria-label="Settings"
                aria-current={isActive('/settings') ? 'page' : undefined}
              >
                <SettingsIcon className="w-5 h-5" />
              </Link>
              <Link
                href="/settings"
                className="w-8 h-8 rounded-full items-center justify-center text-[11px] font-bold text-fg-inverse bg-gradient-to-br from-[#e8dc70] to-mindfit-gold hidden sm:flex ring-1 ring-transparent hover:ring-cta/50 transition-shadow"
                title={fullName || email}
                aria-label="Profile settings"
              >
                {initials}
              </Link>
              <button
                onClick={signOut}
                className="text-fg-3 hover:text-fg-1 text-xs font-medium transition-colors hidden sm:block"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav aria-label="Primary" className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-edge pb-safe">
        <div className="flex items-stretch">
          {tabs.map(tab => {
            const Icon = tab.icon
            const active = isActive(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] text-[11px] font-medium transition-colors ${
                  active ? 'text-cta' : 'text-fg-4'
                }`}
              >
                <Icon className="w-6 h-6" />
                {tab.label}
              </Link>
            )
          })}
        </div>
      </nav>
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
function LearnIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20V4a2 2 0 00-2-2H6.5A2.5 2.5 0 004 4.5v15z" />
      <path d="M4 19.5A2.5 2.5 0 006.5 22H20v-5" />
    </svg>
  )
}
function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4h8v5a4 4 0 01-8 0V4z" />
      <path d="M8 6H5a1 1 0 00-1 1 4 4 0 004 4M16 6h3a1 1 0 011 1 4 4 0 01-4 4" />
      <path d="M12 13v4M9 21h6M10 17h4l1 4H9l1-4z" />
    </svg>
  )
}
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 4.5-3.2 8.4-8 9-4.8-.6-8-4.5-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}
