'use client'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

const FlowLogForm = dynamic(
  () => import('@/components/mindset/flow/FlowLogForm'),
  { ssr: false },
)

export default function FlowLogPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500 p-6">Loading…</p>}>
      <FlowLogForm />
    </Suspense>
  )
}
