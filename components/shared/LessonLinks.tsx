'use client'
import { useEffect, useState } from 'react'
import { Lesson, LessonSection } from '@/types'

// Compact "Learn this in the Locker Room" cards linking a section of
// the app back to the matching Skool classroom lessons. Renders
// nothing while loading or when the section has no published lessons.
export default function LessonLinks({ section }: { section: LessonSection }) {
  const [lessons, setLessons] = useState<Lesson[]>([])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/lessons?section=${section}`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => { if (!cancelled && Array.isArray(data)) setLessons(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [section])

  if (lessons.length === 0) return null

  return (
    <div className="mt-6 border border-cta/20 bg-cta/5 rounded-2xl p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-cta mb-3">
        Learn this in the Locker Room
      </p>
      <div className="space-y-2">
        {lessons.map(lesson => (
          <a
            key={lesson.id}
            href={lesson.skool_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 bg-surface/60 border border-edge-muted hover:border-cta/40 transition-colors group"
          >
            <div className="min-w-0">
              <p className="text-sm text-fg-2 truncate group-hover:text-fg-1">{lesson.title}</p>
              <p className="text-xs text-fg-4 truncate">{lesson.module_name}</p>
            </div>
            <span className="text-cta text-sm shrink-0">→</span>
          </a>
        ))}
      </div>
    </div>
  )
}
