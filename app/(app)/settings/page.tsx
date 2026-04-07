'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email ?? '')
    })
    const saved = localStorage.getItem('theme')
    if (saved === 'light') setTheme('light')
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    if (next === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Settings</h1>

      <div className="space-y-4">
        {/* Account */}
        <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
          <h3 className="font-semibold text-gray-100 mb-3 text-sm">Account</h3>
          <p className="text-sm text-gray-400">{email}</p>
        </div>

        {/* Appearance */}
        <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
          <h3 className="font-semibold text-gray-100 mb-1 text-sm">Appearance</h3>
          <p className="text-sm text-gray-500 mb-4">Switch between dark and light mode.</p>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5 text-cta" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-cta" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="5" />
                <path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            )}
            <span className="text-gray-200">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </div>

        {/* Community */}
        <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
          <h3 className="font-semibold text-gray-100 mb-1 text-sm">MindFit Community</h3>
          <p className="text-sm text-gray-500 mb-4">Connect with other athletes, access courses, and get coached.</p>
          <a
            href="https://www.skool.com/mindfit"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-cta/20 text-cta border border-cta/30 hover:bg-cta/30 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            Open Skool Community →
          </a>
        </div>

        {/* Sign out */}
        <div className="bg-gray-900 rounded-2xl border border-white/10 p-5">
          <h3 className="font-semibold text-gray-100 mb-3 text-sm">Session</h3>
          <button
            onClick={signOut}
            className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors border border-red-400/20 hover:border-red-400/40 px-4 py-2 rounded-xl"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
