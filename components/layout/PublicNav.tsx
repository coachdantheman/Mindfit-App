'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface PublicNavProps {
  email: string | null
  isAdmin: boolean
}

export default function PublicNav({ email, isAdmin }: PublicNavProps) {
  const router = useRouter()
  const supabase = createClient()

  const signOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <nav className="bg-gray-900 border-b border-white/10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="text-cta font-bold text-lg tracking-widest uppercase">
            MindFit
          </Link>

          <div className="flex items-center gap-3">
            {email ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-400 hover:text-gray-100 font-medium transition-colors"
                >
                  My Progress
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="text-sm text-gray-400 hover:text-gray-100 font-medium transition-colors"
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={signOut}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="text-sm bg-cta hover:bg-brand-600 text-gray-900 font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
