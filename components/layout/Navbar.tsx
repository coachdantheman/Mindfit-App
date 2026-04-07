'use client'
import Link from 'next/link'
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

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* Top bar */}
      <nav className="bg-gray-900 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <Link href="/mindset" className="text-cta font-bold text-lg tracking-widest uppercase">
              MindFit
            </Link>

            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-1">
              {tabs.map(tab => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(tab.href) ? 'text-cta' : 'text-gray-400 hover:text-gray-100'
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
              {(role === 'admin' || role === 'coach') && (
                <Link
                  href={role === 'admin' ? '/admin' : '/coach'}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/admin') || isActive('/coach') ? 'text-cta' : 'text-gray-400 hover:text-gray-100'
                  }`}
                >
                  {role === 'admin' ? 'Admin' : 'Coach'}
                </Link>
              )}
              <Link
                href="/settings"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/settings') ? 'text-cta' : 'text-gray-400 hover:text-gray-100'
                }`}
              >
                Settings
              </Link>
            </div>

            <div className="flex items-center gap-2">
              {/* Mobile: admin/coach icon */}
              {(role === 'admin' || role === 'coach') && (
                <Link
                  href={role === 'admin' ? '/admin' : '/coach'}
                  className={`sm:hidden p-1.5 rounded-md transition-colors ${
                    isActive('/admin') || isActive('/coach') ? 'text-cta' : 'text-gray-400'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Link>
              )}
              {/* Settings icon — all users */}
              <Link
                href="/settings"
                className={`p-1.5 rounded-md transition-colors ${
                  isActive('/settings') ? 'text-cta' : 'text-gray-400 hover:text-gray-200'
                }`}
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </Link>
              <span className="text-gray-500 text-xs hidden sm:block truncate max-w-[160px]">{email}</span>
              <button
                onClick={signOut}
                className="text-gray-400 hover:text-gray-100 text-sm font-medium transition-colors hidden sm:block"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar — 5 tabs */}
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

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A5.5 5.5 0 004 7.5c0 .88.21 1.71.58 2.45A4.5 4.5 0 003 13.5 4.5 4.5 0 007 18h1l1 4h6l1-4h1a4.5 4.5 0 004-4.5c0-1.37-.62-2.6-1.58-3.45A5.5 5.5 0 0014.5 2" />
      <path d="M12 2v20" />
      <path d="M8 8c1.33.67 2.67.67 4 0" />
      <path d="M12 8c1.33.67 2.67.67 4 0" />
      <path d="M7.5 13H12" />
      <path d="M12 13h4.5" />
    </svg>
  )
}

function NutritionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="13" rx="8" ry="5" />
      <path d="M7 11c1.5-2 3-3 5-3s3.5 1 5 3" />
      <path d="M9 13.5c1 .5 2 .8 3.5.5s2-.8 3-1.5" />
      <path d="M14 5c-.5-1.5-1-2.5-1-3" />
      <path d="M14 5c1-1 2-1.5 3-1" />
    </svg>
  )
}

function ExerciseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function SleepIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}

function ProgressIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  )
}
