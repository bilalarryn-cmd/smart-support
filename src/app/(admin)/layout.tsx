import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseAdminToken } from '@/lib/admin-auth'
import { Sidebar } from '@/components/shared/sidebar'
import { Topbar } from '@/components/shared/topbar'
import type { UserProfile } from '@/types'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get('admin_token')?.value

  if (!adminToken) redirect('/admin-login')

  const payload = parseAdminToken(adminToken)
  if (!payload) redirect('/admin-login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('*')
    .eq('id', payload.id)
    .single()

  const profileData = (profile ?? {
    id: payload.id,
    full_name: payload.full_name,
    role: 'admin',
    is_active: true,
  }) as UserProfile

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar profile={profileData} />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-60">
        <Topbar profile={profileData} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
