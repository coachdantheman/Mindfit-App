'use client'
import dynamic from 'next/dynamic'

const FiveAStackSession = dynamic(
  () => import('@/components/mindset/flow/FiveAStackSession'),
  { ssr: false },
)

export default function FlowSessionPage() {
  return <FiveAStackSession />
}
