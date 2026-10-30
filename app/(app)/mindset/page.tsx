'use client'
import TabBar from '@/components/shared/TabBar'
import { useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import LessonLinks from '@/components/shared/LessonLinks'
import QuoteOfTheDay from '@/components/mindset/QuoteOfTheDay'
import { LessonSection } from '@/types'

const JournalTab = dynamic(() => import('@/components/mindset/JournalTab'))
const VisualizationForm = dynamic(() => import('@/components/mindset/VisualizationForm'))
const MeditationForm = dynamic(() => import('@/components/mindset/MeditationForm'))
const AffirmationsList = dynamic(() => import('@/components/mindset/AffirmationsList'))
const GoalsSection = dynamic(() => import('@/components/mindset/GoalsSection'))
const WeeklyAssessment = dynamic(() => import('@/components/mindset/WeeklyAssessment'))
const FlowStateTab = dynamic(() => import('@/components/mindset/flow/FlowStateTab'))

const tabs = ['Journal', 'Weekly Assessment', 'Flow State', 'Visualization', 'Meditation', 'Affirmations', 'Goals'] as const
type Tab = typeof tabs[number]

const tabSections: Record<Tab, LessonSection> = {
  'Journal': 'journal',
  'Weekly Assessment': 'weekly_assessment',
  'Flow State': 'flow_state',
  'Visualization': 'visualization',
  'Meditation': 'meditation',
  'Affirmations': 'affirmations',
  'Goals': 'goals',
}

export default function MindsetPage() {
  return (
    <Suspense>
      <MindsetContent />
    </Suspense>
  )
}

function MindsetContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paramTab = searchParams.get('tab')
  const initialTab = tabs.find(t => t === paramTab) ?? 'Journal'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  // Tabs stay mounted once visited so half-written forms survive switching.
  const [visited, setVisited] = useState<Tab[]>([initialTab])

  const selectTab = (tab: Tab) => {
    setActiveTab(tab)
    setVisited(v => v.includes(tab) ? v : [...v, tab])
    router.replace(`/mindset?tab=${encodeURIComponent(tab)}`, { scroll: false })
  }

  const tabContent: Record<Tab, React.ReactNode> = {
    'Journal': <JournalTab />,
    'Weekly Assessment': <WeeklyAssessment />,
    'Flow State': <FlowStateTab />,
    'Visualization': <VisualizationForm />,
    'Meditation': <MeditationForm />,
    'Affirmations': <AffirmationsList />,
    'Goals': <GoalsSection />,
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Mindset</h1>
        <p className="page-subtitle">Train your mind. Build your identity.</p>
      </div>

      <QuoteOfTheDay />

      <TabBar label="Mindset sections" tabs={tabs.map(t => ({ key: t, label: t }))} active={activeTab} onSelect={selectTab} className="snap-x snap-mandatory" itemClassName="snap-start" />

      {visited.map(tab => (
        <div key={tab} className={tab === activeTab ? '' : 'hidden'}>
          {tabContent[tab]}
        </div>
      ))}

      <LessonLinks section={tabSections[activeTab]} />
    </div>
  )
}
