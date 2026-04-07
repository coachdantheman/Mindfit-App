'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email ?? '')
    })
  }, [])

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
