'use client'
import { useState } from 'react'
import WhitelistTable from '@/components/admin/WhitelistTable'
import MemberTable from '@/components/admin/MemberTable'

const tabs = ['Manage Access', 'Members'] as const
type Tab = typeof tabs[number]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Manage Access')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-500 text-sm mt-1">Manage member access and view progress.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {activeTab === 'Manage Access' && <WhitelistTable />}
        {activeTab === 'Members' && <MemberTable />}
      </div>
    </div>
  )
}
