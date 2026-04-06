'use client'
import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Profile, JournalEntry } from '@/types'
import RatingChart from '@/components/dashboard/RatingChart'

interface AthleteData {
  profile: Profile
  journalEntries: JournalEntry[]
}

export default function AthleteDetail({ athleteId, backHref }: { athleteId: string; backHref: string }) {
  const [data, setData] = useState<AthleteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/athlete/${athleteId}`)
      .then(async r => {
        if (!r.ok) throw new Error((await r.json()).error)
        return r.json()
      })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [athleteId])

  if (loading) return <p className="text-sm text-gray-500">Loading athlete data…</p>
  if (error) return <p className="text-sm text-red-400">{error}</p>
  if (!data) return null

  const { profile, journalEntries } = data

  const avgOf = (key: keyof JournalEntry) => {
    if (journalEntries.length === 0) return '—'
    const sum = journalEntries.reduce((acc, e) => acc + (e[key] as number), 0)
    return (sum / journalEntries.length).toFixed(1)
  }

  return (
    <div>
      <a href={backHref} className="text-brand-500 text-sm hover:underline mb-4 inline-block">
        ← Back
      </a>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">{profile.full_name || profile.email}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {profile.email} · Joined {format(parseISO(profile.created_at), 'MMM d, yyyy')}
        </p>
      </div>

      {journalEntries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="font-medium">No journal entries yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Avg Motivation', value: avgOf('rating_motivation'), color: 'text-blue-400 bg-blue-900/30 border border-blue-800/40' },
              { label: 'Avg Focus', value: avgOf('rating_focus'), color: 'text-purple-400 bg-purple-900/30 border border-purple-800/40' },
              { label: 'Avg Confidence', value: avgOf('rating_confidence'), color: 'text-green-400 bg-green-900/30 border border-green-800/40' },
              { label: 'Avg Anxiety', value: avgOf('rating_anxiety'), color: 'text-orange-400 bg-orange-900/30 border border-orange-800/40' },
            ].map(stat => (
              <div key={stat.label} className={`rounded-2xl p-4 text-center ${stat.color}`}>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs mt-1 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>

          <RatingChart entries={journalEntries} />

          <div className="bg-gray-900 rounded-2xl border border-white/10 p-6">
            <h3 className="font-semibold text-gray-100 mb-4">Recent Entries</h3>
            <div className="space-y-3">
              {journalEntries.map(e => (
                <div key={e.id} className="p-3 rounded-xl bg-gray-800/50 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-300">
                      {format(parseISO(e.entry_date), 'EEEE, MMMM d')}
                    </p>
                    <div className="flex gap-1.5">
                      <span className="text-[10px] text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded-full">M:{e.rating_motivation}</span>
                      <span className="text-[10px] text-purple-400 bg-purple-900/30 px-1.5 py-0.5 rounded-full">F:{e.rating_focus}</span>
                      <span className="text-[10px] text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded-full">C:{e.rating_confidence}</span>
                      <span className="text-[10px] text-orange-400 bg-orange-900/30 px-1.5 py-0.5 rounded-full">A:{e.rating_anxiety}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400"><span className="text-gray-500">Objective:</span> {e.objective}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
