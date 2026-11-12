'use client'
import TabBar from '@/components/shared/TabBar'
import { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import LessonLinks from '@/components/shared/LessonLinks'
import QuoteOfTheDay from '@/components/mindset/QuoteOfTheDay'
import PushPrompt from '@/components/shared/PushPrompt'
import { LessonSection } from '@/types'
import TodayCard from '@/components/today/TodayCard'
import PendingGameBanner from '@/components/shared/PendingGameBanner'
import InviteParentCard from '@/components/shared/InviteParentCard'

const JournalTab = dynamic(() => import('@/components/mindset/JournalTab'))
const VisualizationForm = dynamic(() => import('@/components/mindset/VisualizationForm'))
const AffirmationsList = dynamic(() => import('@/components/mindset/AffirmationsList'))
const GoalsSection = dynamic(() => import('@/components/mindset/GoalsSection'))
const WeeklyAssessment = dynamic(() => import('@/components/mindset/WeeklyAssessment'))
const FlowStateTab = dynamic(() => import('@/components/mindset/flow/FlowStateTab'))
const GratitudeTab = dynamic(() => import('@/components/mindset/GratitudeTab'))
const HabitsTab = dynamic(() => import('@/components/mindset/HabitsTab'))
const QuoteVault = dynamic(() => import('@/components/mindset/QuoteVault'))
const MusicTab = dynamic(() => import('@/components/mindset/MusicTab'))

const tabs = ['Journal', 'Gratitude', 'MPI Weekly Assessment', 'Flow State', 'Visualization', 'Affirmations', 'Goals', 'Habits', 'Quote Vault', 'Music'] as const
type Tab = typeof tabs[number]

// Old ?tab= names still land on the right tab.
const tabAliases: Record<string, Tab> = { 'Weekly Assessment': 'MPI Weekly Assessment', 'Meditation': 'Visualization' }

const tabSections: Partial<Record<Tab, LessonSection>> = {
  'Journal': 'journal',
  'Gratitude': 'gratitude',
  'MPI Weekly Assessment': 'weekly_assessment',
  'Flow State': 'flow_state',
  'Visualization': 'visualization',
  'Affirmations': 'affirmations',
  'Goals': 'goals',
  'Habits': 'goals',
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
  const initialTab = tabs.find(t => t === paramTab) ?? (paramTab ? tabAliases[paramTab] : undefined) ?? 'Journal'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  // Tabs stay mounted once visited so half-written forms survive switching.
  const [visited, setVisited] = useState<Tab[]>([initialTab])

  // Same-page links (e.g. Goals → "Open Habits") only change the URL, so follow it.
  useEffect(() => {
    setActiveTab(initialTab)
    setVisited(v => v.includes(initialTab) ? v : [...v, initialTab])
  }, [initialTab])

  const selectTab = (tab: Tab) => {
    setActiveTab(tab)
    setVisited(v => v.includes(tab) ? v : [...v, tab])
    router.replace(`/mindset?tab=${encodeURIComponent(tab)}`, { scroll: false })
  }

  const tabContent: Record<Tab, React.ReactNode> = {
    'Journal': <JournalTab />,
    'Gratitude': <GratitudeTab />,
    'MPI Weekly Assessment': <WeeklyAssessment />,
    'Flow State': <FlowStateTab />,
    'Visualization': <VisualizationForm />,
    'Affirmations': <AffirmationsList />,
    'Goals': <GoalsSection />,
    'Habits': <HabitsTab />,
    'Quote Vault': <QuoteVault />,
    'Music': <MusicTab />,
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Mindset</h1>
        <p className="page-subtitle">Train your mind. Build your identity.</p>
      </div>

      <PendingGameBanner />

      <TodayCard />

      <PushPrompt />

      <InviteParentCard />

      <QuoteOfTheDay />

      <TabBar label="Mindset sections" tabs={tabs.map(t => ({ key: t, label: t }))} active={activeTab} onSelect={selectTab} className="snap-x snap-mandatory" itemClassName="snap-start" />

      {visited.map(tab => (
        <div key={tab} className={tab === activeTab ? '' : 'hidden'}>
          {tabContent[tab]}
        </div>
      ))}

      {tabSections[activeTab] && <LessonLinks section={tabSections[activeTab]!} />}
    </div>
  )
}
