'use client'
import { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { MemberWithCount } from '@/types'
import AddEmailForm from '@/components/admin/AddEmailForm'
import CreateWorkout from '@/components/coach/CreateWorkout'
import Link from 'next/link'

export default function CoachPage() {
  const [athletes, setAthletes] = useState<MemberWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'athletes' | 'add' | 'workouts'>('athletes')

  const fetchAthletes = useCallback(async () => {
    const res = await fetch('/api/coach/athletes')
    if (res.ok) setAthletes(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchAthletes() }, [fetchAthletes])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Coach Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Manage and monitor your athletes.</p>
      </div>

      <div className="flex gap-1 bg-white/5 p-1 rounded-xl mb-6 w-fit">
        {([
          { key: 'athletes' as const, label: 'My Athletes' },
          { key: 'add' as const, label: 'Add Athlete' },
          { key: 'workouts' as const, label: 'Create Workouts' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-gray-800 text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 rounded-2xl border border-white/10 p-6">
        {tab === 'add' ? (
          <div>
            <h3 className="font-semibold text-gray-100 mb-1">Add New Athlete</h3>
            <p className="text-sm text-gray-500 mb-3">Enter their email to grant app access. They'll be linked to you automatically when they sign up.</p>
            <AddEmailForm onAdded={() => { fetchAthletes(); setTab('athletes') }} />
          </div>
        ) : tab === 'workouts' ? (
          <CreateWorkout />
        ) : loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : athletes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="font-medium">No athletes yet</p>
            <p className="text-sm mt-1">Add athlete emails to get started.</p>
            <button
              onClick={() => setTab('add')}
              className="mt-4 bg-cta hover:bg-brand-600 text-gray-900 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              Add Your First Athlete
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {athletes.map(a => (
              <Link
                key={a.id}
                href={`/coach/athlete/${a.id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-800 transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-gray-200 group-hover:text-cta transition-colors">
                    {a.full_name || a.email}
                  </p>
                  {a.full_name && <p className="text-xs text-gray-500">{a.email}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    Joined {format(parseISO(a.created_at), 'MMM d, yyyy')}
                  </span>
                  <span className="text-xs font-semibold text-cta bg-cta/10 px-2 py-1 rounded-full">
                    {a.entry_count} entries
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
