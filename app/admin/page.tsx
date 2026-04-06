'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import WhitelistTable from '@/components/admin/WhitelistTable'
import MemberTable from '@/components/admin/MemberTable'
import CoachManager from '@/components/admin/CoachManager'

const tabs = ['Manage Access', 'Members', 'Coaches'] as const
type Tab = typeof tabs[number]

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">Loading…</p>}>
      <AdminContent />
    </Suspense>
  )
}

function AdminContent() {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab | null) ?? 'Manage Access'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Admin Panel</h1>
        <p className="text-gray-500 text-sm mt-1">Manage member access, coaches, and view progress.</p>
      </div>

      <div className="flex gap-1 bg-white/5 p-1 rounded-xl mb-6 w-fit">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-gray-800 text-gray-100 shadow-sm'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 rounded-2xl border border-white/10 p-6">
        {activeTab === 'Manage Access' && <WhitelistTable />}
        {activeTab === 'Members' && <MemberTable />}
        {activeTab === 'Coaches' && <CoachManager />}
      </div>
    </div>
  )
}
