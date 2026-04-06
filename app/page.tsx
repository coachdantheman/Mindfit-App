import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import JournalForm from '@/components/journal/JournalForm'
import PublicNav from '@/components/layout/PublicNav'

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) redirect('/mindset')

  return (
    <div className="min-h-screen flex flex-col bg-mindfit-bg">
      <PublicNav email={null} isAdmin={false} />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-100">MindFit Academy</h1>
          <p className="text-gray-500 text-sm mt-1">
            Your complete athlete development platform.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-brand-600/10 border border-brand-600/30 rounded-2xl p-5 text-center">
            <p className="text-cta font-medium">Sign in to track your mindset, nutrition, exercise, and recovery</p>
            <a
              href="/login"
              className="inline-block mt-3 bg-cta hover:bg-brand-600 text-gray-900 font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              Sign in to get started
            </a>
          </div>

          <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 text-center">
            <p className="text-gray-300 font-medium">Don&apos;t have access yet?</p>
            <p className="text-gray-500 text-sm mt-1">
              Join the MindFit community to unlock the full athlete development platform.
            </p>
            <a
              href="https://www.skool.com/mindfit"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 border border-cta/40 text-cta hover:bg-cta/10 font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              Request Access
            </a>
          </div>

          <JournalForm previewMode />
        </div>
      </main>
    </div>
  )
}
