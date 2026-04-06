import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import Navbar from '@/components/layout/Navbar'

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()
  if (!user) redirect('/')
  if (user.role !== 'coach') redirect('/')

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar email={user.email} role={user.role} />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 pb-24 sm:pb-8">
        {children}
      </main>
    </div>
  )
}
