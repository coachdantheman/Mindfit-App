'use client'
import { useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import LessonLinks from '@/components/shared/LessonLinks'
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

  const selectTab = (tab: Tab) => {
    setActiveTab(tab)
    router.replace(`/mindset?tab=${encodeURIComponent(tab)}`, { scroll: false })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Mindset</h1>
        <p className="page-subtitle">Train your mind. Build your identity.</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => selectTab(tab)}
            className={`snap-start shrink-0 ${activeTab === tab ? 'tab-btn-active' : 'tab-btn'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Journal' && <JournalTab />}
      {activeTab === 'Weekly Assessment' && <WeeklyAssessment />}
      {activeTab === 'Flow State' && <FlowStateTab />}
      {activeTab === 'Visualization' && <VisualizationForm />}
      {activeTab === 'Meditation' && <MeditationForm />}
      {activeTab === 'Affirmations' && <AffirmationsList />}
      {activeTab === 'Goals' && <GoalsSection />}

      <LessonLinks section={tabSections[activeTab]} />
    </div>
  )
}
