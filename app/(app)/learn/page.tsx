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
        <h1 className="text-2xl font-bold text-gray-100">Learn</h1>
        <p className="text-gray-500 text-sm mt-1">
          The full MindFit curriculum lives in the Locker Room. Each lesson opens in the Skool classroom.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-cta/30 border-t-cta rounded-full animate-spin" />
        </div>
      ) : lessons.length === 0 ? (
        <div className="bg-gray-900 rounded-2xl border border-white/10 p-10 text-center">
          <p className="text-gray-400 mb-4">Lessons are coming soon.</p>
          <a
            href="https://www.skool.com/mindfit"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-cta text-gray-900 font-semibold px-6 py-3 rounded-xl text-sm"
          >
            Visit the Locker Room →
          </a>
        </div>
      ) : (
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
                    className="flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 bg-gray-900 border border-white/10 hover:border-cta/40 transition-colors group"
                  >
                    <span className="text-sm text-gray-200 group-hover:text-white truncate">{lesson.title}</span>
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
