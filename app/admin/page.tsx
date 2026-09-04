'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import WhitelistTable from '@/components/admin/WhitelistTable'
import MemberTable from '@/components/admin/MemberTable'
import CoachManager from '@/components/admin/CoachManager'
import LessonManager from '@/components/admin/LessonManager'

const tabs = ['Skool & Coach Access', 'Members', 'Coaches', 'Lessons'] as const
type Tab = typeof tabs[number]

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-sm text-fg-4">Loading…</p>}>
      <AdminContent />
    </Suspense>
  )
}

function AdminContent() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab | null) ?? 'Skool & Coach Access'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle">Manage member access, coaches, and view progress.</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
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

      <div className="card p-6">
        {activeTab === 'Skool & Coach Access' && <WhitelistTable />}
        {activeTab === 'Members' && <MemberTable />}
        {activeTab === 'Coaches' && <CoachManager />}
        {activeTab === 'Lessons' && <LessonManager />}
      </div>
    </div>
  )
}
