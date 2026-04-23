'use client'
import dynamic from 'next/dynamic'

const FlowInsightsView = dynamic(
  () => import('@/components/mindset/flow/FlowInsightsView'),
  { ssr: false },
)

export default function FlowInsightsPage() {
  return <FlowInsightsView />
}
