import { redirect } from 'next/navigation'
import { getAuthUserCached } from '@/lib/auth'

// Guide characters are for athletes (and admins, who see what athletes see).
export default async function GuidesLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUserCached()
  if (!user) redirect('/')
  if (user.role !== 'member' && user.role !== 'admin') redirect('/mindset')
  return children
}
