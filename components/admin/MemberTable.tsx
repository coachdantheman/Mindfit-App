'use client'
import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { MemberWithCount } from '@/types'
import Link from 'next/link'
import Skeleton from '@/components/shared/Skeleton'

export default function MemberTable() {
  const [members, setMembers] = useState<MemberWithCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/members')
      .then(r => r.json())
      .then(data => { setMembers(data); setLoading(false) })
  }, [])

  const remove = async (m: MemberWithCount) => {
    if (!confirm(`Delete ${m.email} and ALL their data? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/members/${m.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { alert(data.error || 'Delete failed'); return }
    setMembers(prev => prev.filter(x => x.id !== m.id))
  }

  if (loading) return <Skeleton />

  if (members.length === 0) {
    return <p className="text-sm text-fg-4">No members have registered yet.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-fg-4 border-b border-edge">
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Email</th>
            <th className="pb-2 font-medium">Joined</th>
            <th className="pb-2 font-medium">Entries</th>
            <th className="pb-2 font-medium">Role</th>
            <th className="pb-2 font-medium"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-edge-muted">
          {members.map(m => (
            <tr key={m.id} className="group">
              <td className="py-2.5 pr-4">
                <Link
                  href={`/admin/athlete/${m.id}`}
                  className="font-medium text-fg-2 hover:text-cta transition-colors"
                >
                  {m.full_name || '—'}
                </Link>
              </td>
              <td className="py-2.5 pr-4 text-fg-3">{m.email}</td>
              <td className="py-2.5 pr-4 text-fg-4">{format(parseISO(m.created_at), 'MMM d, yyyy')}</td>
              <td className="py-2.5 pr-4">
                <span className="font-semibold text-cta">{m.entry_count}</span>
              </td>
              <td className="py-2.5">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  m.role === 'admin'
                    ? 'bg-cta/20 text-cta'
                    : m.role === 'coach'
                    ? 'bg-purple-500/15 text-purple-400'
                    : 'bg-surface-3/60 text-fg-3'
                }`}>
                  {m.role}
                </span>
              </td>
              <td className="py-2.5 text-right">
                {m.role !== 'admin' && (
                  <button type="button" onClick={() => remove(m)} className="text-xs text-fg-4 hover:text-red-400" aria-label={`Delete ${m.email}`}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
