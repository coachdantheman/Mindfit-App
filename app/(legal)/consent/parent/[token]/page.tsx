import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase-server'
import { findConsentByToken } from '@/lib/consent'
import ParentNotice from '@/components/consent/ParentNotice'
import ConsentForm from '@/components/consent/ConsentForm'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const metadata: Metadata = { title: 'Parent permission | MindFit', robots: { index: false, follow: false } }

export default async function ParentConsentPage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const row = await findConsentByToken(createAdminClient(), params.token)
  if (!row || row.status === 'superseded') {
    return (
      <p className="text-fg-2 leading-relaxed">
        This link is no longer valid. If your child sent a newer request, use the most recent email from MindFit.
      </p>
    )
  }

  const athlete = row.athlete
  const childName: string = athlete.full_name || athlete.email

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-fg-1">Parent permission for {childName}</h1>
        <p className="text-fg-3 text-sm leading-relaxed">
          {childName} wants to use MindFit, a mental performance training app for young athletes. Please read how we would handle their information, then decide below.
        </p>
      </div>

      <ParentNotice childName={childName} />

      <ConsentForm
        token={params.token}
        childName={childName}
        granted={athlete.consent_status === 'granted'}
        initial={{
          shareCoaches: !!athlete.consent_share_coaches,
          ai: !!athlete.consent_ai,
          leaderboard: !!athlete.consent_leaderboard,
        }}
      />
    </div>
  )
}
