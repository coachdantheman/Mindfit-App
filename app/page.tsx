import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-client'
import JournalForm from '@/components/journal/JournalForm'
import PublicNav from '@/components/layout/PublicNav'

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) redirect('/mindset')

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <PublicNav email={null} isAdmin={false} />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-8 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cta mb-2">MindFit Academy</p>
          <h1 className="font-display text-3xl sm:text-4xl text-fg-1 leading-tight">
            Peak performance is an identity achievement.
          </h1>
          <p className="text-fg-3 text-sm mt-3">
            Train your mind like you train your body — mindset, nutrition, exercise, and
            recovery in one place.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-brand-600/10 border border-brand-600/30 rounded-2xl p-5 text-center">
            <p className="text-cta font-medium">
              Track your mindset, nutrition, exercise, and recovery — free
            </p>
            <a
              href="/login"
              className="inline-block mt-3 bg-cta hover:bg-brand-600 text-fg-inverse font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              Create your free account
            </a>
          </div>

          <div className="bg-surface border border-edge rounded-2xl p-5 text-center">
            <p className="text-fg-2 font-medium">Want coaching and the full course?</p>
            <p className="text-fg-4 text-sm mt-1">
              Join the MindFit community for group coaching, the complete sport psychology
              course, and automatic coach linking in the app.
            </p>
            <a
              href="https://www.skool.com/mindfit"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 border border-cta/40 text-cta hover:bg-cta/10 font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              Join the Community
            </a>
          </div>

          <JournalForm previewMode />
        </div>
      </main>
    </div>
  )
}
