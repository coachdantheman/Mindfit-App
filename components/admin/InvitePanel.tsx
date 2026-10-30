'use client'
import { useState } from 'react'
import ShareLinkCard from './ShareLinkCard'
import WhitelistTable from './WhitelistTable'
import BulkClaimForm from '@/components/coach/BulkClaimForm'

export default function InvitePanel() {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="space-y-8">
      <ShareLinkCard />

      <div>
        <h3 className="font-semibold text-fg-1 mb-1">Invite by email</h3>
        <p className="text-sm text-fg-4 mb-3">One athlete or a whole roster. Each gets an account and an email with a one-click sign-in link.</p>
        <BulkClaimForm
          endpoint="/api/admin/invite"
          onDone={() => setRefreshKey(k => k + 1)}
          copy={{
            placeholder: 'One per line, comma-separated, or paste a roster.\nJordan Lee, jordan@example.com\nsam@example.com',
            button: n => `Invite ${n || ''} athlete${n === 1 ? '' : 's'}`,
            done: n => `${n} invited`,
            footnote: 'Invited athletes appear under Athletes right away, marked Invited until they sign in. They can also create their account with the same email.',
          }}
        />
      </div>

      <WhitelistTable refreshKey={refreshKey} />
    </div>
  )
}
