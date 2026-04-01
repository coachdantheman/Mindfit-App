'use client'
import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { ApprovedEmail } from '@/types'
import AddEmailForm from './AddEmailForm'

export default function WhitelistTable() {
  const [emails, setEmails] = useState<ApprovedEmail[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEmails = useCallback(async () => {
    const res = await fetch('/api/admin/whitelist')
    if (res.ok) setEmails(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchEmails() }, [fetchEmails])

  const removeEmail = async (id: string) => {
    if (!confirm('Remove this email from the approved list?')) return
    await fetch('/api/admin/whitelist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setEmails(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-gray-900 mb-1">Add New Member</h3>
        <p className="text-sm text-gray-500 mb-3">Enter the email of a paying Skool member to grant them access.</p>
        <AddEmailForm onAdded={fetchEmails} />
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">
          Approved Emails <span className="text-gray-400 font-normal">({emails.length})</span>
        </h3>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : emails.length === 0 ? (
          <p className="text-sm text-gray-400">No emails added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Added</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Notes</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {emails.map(e => (
                  <tr key={e.id} className="py-2">
                    <td className="py-2.5 pr-4 font-medium text-gray-800">{e.email}</td>
                    <td className="py-2.5 pr-4 text-gray-500">{format(parseISO(e.added_at), 'MMM d, yyyy')}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        e.registered
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {e.registered ? 'Registered' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-400">{e.notes || '—'}</td>
                    <td className="py-2.5">
                      <button
                        onClick={() => removeEmail(e.id)}
                        className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors"
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
    </div>
  )
}
