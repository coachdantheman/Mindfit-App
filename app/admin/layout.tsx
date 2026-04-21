import { redirect } from 'next/navigation'
import { getAuthUserCached } from '@/lib/auth'
import Navbar from '@/components/layout/Navbar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUserCached()
  if (!user) redirect('/')
  if (user.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar email={user.email} role={user.role} fullName={user.fullName} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 pb-24 sm:pb-8">
        {children}
      </main>
    </div>
  )
}
