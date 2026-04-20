import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import ProfileClient from './ProfileClient'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  return <ProfileClient session={session} />
}
