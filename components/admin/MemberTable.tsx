'use client'
import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { MemberWithCount } from '@/types'
import Link from 'next/link'

export default function MemberTable() {
  const [members, setMembers] = useState<MemberWithCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/members')
      .then(r => r.json())
      .then(data => { setMembers(data); setLoading(false) })
  }, [])

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>

  if (members.length === 0) {
    return <p className="text-sm text-gray-500">No members have registered yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-white/10">
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Email</th>
            <th className="pb-2 font-medium">Joined</th>
            <th className="pb-2 font-medium">Entries</th>
            <th className="pb-2 font-medium">Role</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {members.map(m => (
            <tr key={m.id} className="group">
              <td className="py-2.5 pr-4">
                <Link
                  href={`/admin/athlete/${m.id}`}
                  className="font-medium text-gray-300 hover:text-cta transition-colors"
                >
                  {m.full_name || '—'}
                </Link>
              </td>
              <td className="py-2.5 pr-4 text-gray-400">{m.email}</td>
              <td className="py-2.5 pr-4 text-gray-500">{format(parseISO(m.created_at), 'MMM d, yyyy')}</td>
              <td className="py-2.5 pr-4">
                <span className="font-semibold text-cta">{m.entry_count}</span>
              </td>
              <td className="py-2.5">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  m.role === 'admin'
                    ? 'bg-cta/20 text-cta'
                    : m.role === 'coach'
                    ? 'bg-purple-900/40 text-purple-400'
                    : 'bg-white/10 text-gray-400'
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
