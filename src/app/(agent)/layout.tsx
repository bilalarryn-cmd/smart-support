import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/shared/sidebar'
import { Topbar } from '@/components/shared/topbar'
import type { UserProfile } from '@/types'

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'customer') redirect('/dashboard')
  if (profile?.role === 'admin') redirect('/admin/dashboard')

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
