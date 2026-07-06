'use client'
import { useCallback, useEffect, useState } from 'react'
import { Lesson, LessonSection } from '@/types'
import Skeleton from '@/components/shared/Skeleton'

const SECTIONS: { value: LessonSection; label: string }[] = [
  { value: 'journal', label: 'Journal' },
  { value: 'weekly_assessment', label: 'Weekly Assessment' },
  { value: 'flow_state', label: 'Flow State' },
  { value: 'visualization', label: 'Visualization' },
  { value: 'meditation', label: 'Meditation' },
  { value: 'affirmations', label: 'Affirmations' },
  { value: 'goals', label: 'Goals' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'progress', label: 'Progress' },
  { value: 'general', label: 'General' },
]

const inputClass =
  'w-full border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-gray-800 text-gray-100 placeholder:text-gray-500'

export default function LessonManager() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [moduleName, setModuleName] = useState('')
  const [section, setSection] = useState<LessonSection>('general')

  const fetchLessons = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/lessons?all=1')
    const data = await res.json()
    if (res.ok && Array.isArray(data)) setLessons(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchLessons() }, [fetchLessons])

  const addLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await fetch('/api/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, skool_url: url, module_name: moduleName, app_section: section }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setError(data.error || 'Could not save the lesson.')
      return
    }
    setTitle(''); setUrl('')
    fetchLessons()
  }

  const togglePublished = async (lesson: Lesson) => {
    await fetch('/api/lessons', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lesson.id, is_published: !lesson.is_published }),
    })
    fetchLessons()
  }

  const removeLesson = async (lesson: Lesson) => {
    if (!confirm(`Remove "${lesson.title}"?`)) return
    await fetch('/api/lessons', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lesson.id }),
    })
    fetchLessons()
  }

  const sectionLabel = (value: LessonSection) =>
    SECTIONS.find(s => s.value === value)?.label ?? value

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-100 mb-1">Skool Lessons</h2>
      <p className="text-sm text-gray-500 mb-6">
        Link classroom lessons to app sections. Members see them as &ldquo;Learn this in the Locker Room&rdquo; cards.
      </p>

      <form onSubmit={addLesson} className="grid gap-3 sm:grid-cols-2 mb-8 bg-white/5 rounded-2xl p-4">
        <input required value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="Lesson title" />
        <input required value={url} onChange={e => setUrl(e.target.value)} className={inputClass} placeholder="https://www.skool.com/mindfit/classroom/…" />
        <input required value={moduleName} onChange={e => setModuleName(e.target.value)} className={inputClass} placeholder="Module (e.g. Confidence Foundations)" />
        <div className="flex gap-3">
          <select value={section} onChange={e => setSection(e.target.value as LessonSection)} className={inputClass}>
            {SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button
            type="submit"
            disabled={saving}
            className="shrink-0 bg-cta hover:bg-brand-600 text-gray-900 font-semibold px-5 rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm sm:col-span-2">{error}</p>}
      </form>

      {loading ? (
        <Skeleton />
      ) : lessons.length === 0 ? (
        <p className="text-sm text-gray-500">No lessons yet. Add your first Skool lesson above.</p>
      ) : (
        <div className="space-y-2">
          {lessons.map(lesson => (
            <div key={lesson.id} className="flex items-center gap-3 rounded-xl px-4 py-3 bg-gray-800/60 border border-white/5">
              <div className="min-w-0 flex-1">
                <p className={`text-sm truncate ${lesson.is_published ? 'text-gray-200' : 'text-gray-500 line-through'}`}>
                  {lesson.title}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {lesson.module_name} · {sectionLabel(lesson.app_section)}
                </p>
              </div>
              <a href={lesson.skool_url} target="_blank" rel="noopener noreferrer" className="text-xs text-cta hover:underline shrink-0">
                Open
              </a>
              <button onClick={() => togglePublished(lesson)} className="text-xs text-gray-400 hover:text-gray-200 shrink-0">
                {lesson.is_published ? 'Unpublish' : 'Publish'}
              </button>
              <button onClick={() => removeLesson(lesson)} className="text-xs text-red-400/80 hover:text-red-400 shrink-0">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
