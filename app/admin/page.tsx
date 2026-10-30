'use client'
import TabBar from '@/components/shared/TabBar'
import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import InvitePanel from '@/components/admin/InvitePanel'
import MemberTable from '@/components/admin/MemberTable'
import CoachManager from '@/components/admin/CoachManager'
import LessonManager from '@/components/admin/LessonManager'

const tabs = [
  { key: 'athletes', label: 'Athletes' },
  { key: 'invite', label: 'App invite' },
  { key: 'coaches', label: 'Coaches' },
  { key: 'lessons', label: 'Lessons' },
] as const
type TabKey = typeof tabs[number]['key']

// Old bookmarks / back-links used the label as the key.
const LEGACY: Record<string, TabKey> = {
  'Members': 'athletes', 'Skool & Coach Access': 'invite', 'Coaches': 'coaches', 'Lessons': 'lessons',
}

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-sm text-fg-4">Loading…</p>}>
      <AdminContent />
    </Suspense>
  )
}

function AdminContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const raw = searchParams.get('tab') ?? ''
  const activeTab: TabKey = tabs.some(t => t.key === raw) ? (raw as TabKey) : (LEGACY[raw] ?? 'athletes')
  const select = (key: TabKey) => router.replace(`/admin?tab=${key}`, { scroll: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-subtitle">Invite athletes, manage coaches, and view progress.</p>
      </div>

      <TabBar label="Admin sections" tabs={tabs.map(t => ({ key: t.key, label: t.label }))} active={activeTab} onSelect={select} />

      <div className="card p-6">
        {activeTab === 'athletes' && <MemberTable />}
        {activeTab === 'invite' && <InvitePanel />}
        {activeTab === 'coaches' && <CoachManager />}
        {activeTab === 'lessons' && <LessonManager />}
      </div>
    </div>
  )
}
