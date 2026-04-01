'use client'
import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { MemberWithCount } from '@/types'

export default function MemberTable() {
  const [members, setMembers] = useState<MemberWithCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/members')
      .then(r => r.json())
      .then(data => { setMembers(data); setLoading(false) })
  }, [])

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>

  if (members.length === 0) {
    return <p className="text-sm text-gray-400">No members have registered yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Email</th>
            <th className="pb-2 font-medium">Joined</th>
            <th className="pb-2 font-medium">Entries</th>
            <th className="pb-2 font-medium">Role</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {members.map(m => (
            <tr key={m.id}>
              <td className="py-2.5 pr-4 font-medium text-gray-800">{m.full_name || '—'}</td>
              <td className="py-2.5 pr-4 text-gray-600">{m.email}</td>
              <td className="py-2.5 pr-4 text-gray-500">{format(parseISO(m.created_at), 'MMM d, yyyy')}</td>
              <td className="py-2.5 pr-4">
                <span className="font-semibold text-brand-600">{m.entry_count}</span>
              </td>
              <td className="py-2.5">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  m.role === 'admin'
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {m.role}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
