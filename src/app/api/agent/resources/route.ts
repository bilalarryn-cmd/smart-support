import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Returns agents list + canned responses — for use inside agent ticket detail
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const [agentsRes, cannedRes] = await Promise.all([
    db.from('user_profiles').select('id, full_name, avatar_url, role').eq('role', 'agent').eq('is_active', true).order('full_name'),
    db.from('canned_responses').select('id, title, content, category').eq('is_active', true).order('category').order('title'),
  ])

  return NextResponse.json({
    agents: agentsRes.data ?? [],
    cannedResponses: cannedRes.data ?? [],
  })
}
