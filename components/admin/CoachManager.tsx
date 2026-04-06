'use client'
import { useState, useEffect } from 'react'
import { MemberWithCount } from '@/types'

export default function CoachManager() {
  const [members, setMembers] = useState<MemberWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/members')
      .then(r => r.json())
      .then(data => { setMembers(data); setLoading(false) })
  }, [])

  const toggleCoach = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'coach' ? 'member' : 'coach'
    if (!confirm(`${newRole === 'coach' ? 'Promote' : 'Demote'} this user ${newRole === 'coach' ? 'to coach' : 'back to member'}?`)) return

    setUpdating(userId)
    const res = await fetch('/api/admin/coaches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newRole }),
    })

    if (res.ok) {
      setMembers(prev => prev.map(m =>
        m.id === userId ? { ...m, role: newRole as any } : m
      ))
    }
    setUpdating(null)
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>

  const nonAdmins = members.filter(m => m.role !== 'admin')

  if (nonAdmins.length === 0) {
    return <p className="text-sm text-gray-500">No members to manage.</p>
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Promote members to coach so they can add and monitor their own athletes.</p>
      <div className="space-y-2">
        {nonAdmins.map(m => (
          <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50 border border-white/5">
            <div>
              <p className="text-sm font-medium text-gray-200">{m.full_name || m.email}</p>
              {m.full_name && <p className="text-xs text-gray-500">{m.email}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                m.role === 'coach'
                  ? 'bg-purple-900/40 text-purple-400'
                  : 'bg-white/10 text-gray-400'
              }`}>
                {m.role}
              </span>
              <button
                onClick={() => toggleCoach(m.id, m.role)}
                disabled={updating === m.id}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                  m.role === 'coach'
                    ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                    : 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50'
                }`}
              >
                {updating === m.id ? '…' : m.role === 'coach' ? 'Remove Coach' : 'Make Coach'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
