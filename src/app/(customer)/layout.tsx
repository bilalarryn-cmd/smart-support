import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Sidebar } from '@/components/shared/sidebar'
import { Topbar } from '@/components/shared/topbar'
import type { UserProfile } from '@/types'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = (user.user_metadata?.role as string) ?? 'customer'
  if (role === 'admin') redirect('/admin/dashboard')
  if (role === 'agent') redirect('/agent/dashboard')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar profile={profile as UserProfile} />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-60">
        <Topbar profile={profile as UserProfile} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
