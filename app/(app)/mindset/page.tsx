'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'

const JournalTab = dynamic(() => import('@/components/mindset/JournalTab'))
const VisualizationForm = dynamic(() => import('@/components/mindset/VisualizationForm'))
const MeditationForm = dynamic(() => import('@/components/mindset/MeditationForm'))
const AffirmationsList = dynamic(() => import('@/components/mindset/AffirmationsList'))
const GoalsSection = dynamic(() => import('@/components/mindset/GoalsSection'))
const WeeklyAssessment = dynamic(() => import('@/components/mindset/WeeklyAssessment'))
const FlowStateTab = dynamic(() => import('@/components/mindset/flow/FlowStateTab'))

const tabs = ['Journal', 'Weekly Assessment', 'Flow State', 'Visualization', 'Meditation', 'Affirmations', 'Goals'] as const
type Tab = typeof tabs[number]

export default function MindsetPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Journal')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Mindset</h1>
        <p className="text-gray-500 text-sm mt-1">Train your mind. Build your identity.</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? 'tab-btn-active' : 'tab-btn'}
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
    </div>
  )
}
