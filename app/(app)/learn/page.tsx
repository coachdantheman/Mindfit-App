'use client'
import { useEffect, useState } from 'react'
import { Lesson } from '@/types'

export default function LearnPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/lessons')
      .then(r => (r.ok ? r.json() : []))
      .then(data => { if (Array.isArray(data)) setLessons(data) })
      .finally(() => setLoading(false))
  }, [])

  const modules = lessons.reduce<Record<string, Lesson[]>>((acc, lesson) => {
    ;(acc[lesson.module_name] ||= []).push(lesson)
    return acc
  }, {})

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Learn</h1>
        <p className="page-subtitle">
          The complete MindFit course is live in the Locker Room, our Skool community. Every lesson is there and ready.
        </p>
      </div>

      <div className="card p-6 mb-8">
        <p className="text-sm text-fg-2 mb-1 font-semibold">The full course, in one place</p>
        <p className="text-sm text-fg-3 mb-4">
          Lessons teach the why. This app is where you put it into practice every day.
        </p>
        <a
          href="https://www.skool.com/mindfit"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-cta text-fg-inverse font-semibold px-6 py-3 rounded-xl text-sm"
        >
          Open the course in Skool →
        </a>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-cta/30 border-t-cta rounded-full animate-spin" />
        </div>
      ) : lessons.length === 0 ? null : (
        <div className="space-y-8">
          {Object.entries(modules).map(([moduleName, moduleLessons]) => (
            <section key={moduleName}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-cta mb-3">{moduleName}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {moduleLessons.map(lesson => (
                  <a
                    key={lesson.id}
                    href={lesson.skool_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 bg-surface border border-edge hover:border-cta/40 transition-colors group"
                  >
                    <span className="text-sm text-fg-2 group-hover:text-fg-1 truncate">{lesson.title}</span>
                    <span className="text-cta shrink-0">→</span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
