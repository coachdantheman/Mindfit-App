'use client'
import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { ApprovedEmail } from '@/types'
import Skeleton from '@/components/shared/Skeleton'

export default function WhitelistTable({ refreshKey = 0 }: { refreshKey?: number }) {
  const [emails, setEmails] = useState<ApprovedEmail[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEmails = useCallback(async () => {
    const res = await fetch('/api/admin/whitelist')
    if (res.ok) setEmails(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchEmails() }, [fetchEmails, refreshKey])

  const removeEmail = async (id: string) => {
    if (!confirm('Remove this invite from the list? Their account (if any) stays.')) return
    await fetch('/api/admin/whitelist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setEmails(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div>
      <h3 className="font-semibold text-fg-1 mb-1">
        Invites <span className="text-fg-4 font-normal">({emails.length})</span>
      </h3>
      <p className="text-sm text-fg-4 mb-3">Everyone invited here, by a coach, or through Skool.</p>
      {loading ? (
        <Skeleton />
      ) : emails.length === 0 ? (
        <p className="text-sm text-fg-4">No invites yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-fg-4 border-b border-edge">
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium hidden sm:table-cell">Added</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium hidden md:table-cell">Via</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-muted">
              {emails.map(e => (
                <tr key={e.id}>
                  <td className="py-2.5 pr-3 max-w-[180px] sm:max-w-none">
                    <p className="font-medium text-fg-2 truncate">{e.full_name || e.email}</p>
                    {e.full_name && <p className="text-xs text-fg-4 truncate">{e.email}</p>}
                  </td>
                  <td className="py-2.5 pr-3 text-fg-4 whitespace-nowrap hidden sm:table-cell">{format(parseISO(e.added_at), 'MMM d, yyyy')}</td>
                  <td className="py-2.5 pr-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                      e.registered ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'
                    }`}>
                      {e.registered ? 'Has account' : 'No account yet'}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-fg-4 hidden md:table-cell">{e.source === 'skool' ? 'Skool' : e.notes || '—'}</td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => removeEmail(e.id)}
                      className="text-xs text-fg-4 hover:text-red-400 font-medium transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
