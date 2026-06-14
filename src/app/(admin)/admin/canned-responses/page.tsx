import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CannedResponsesClient } from './client'

export default async function CannedResponsesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: responses } = await supabase
    .from('canned_responses')
    .select('*')
    .order('category')
    .order('title')

  return <CannedResponsesClient initialResponses={responses ?? []} />
}
