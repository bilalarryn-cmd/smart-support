import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const priority = searchParams.get('priority')
  const country = searchParams.get('country')
  const search = searchParams.get('search')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')

  const db = createAdminClient()

  let q = db
    .from('tickets')
    .select('*, customer:user_profiles!customer_id(*), category:ticket_categories(name, color)')
    .is('assigned_agent_id', null)
    .not('status', 'in', '(resolved,closed)')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })

  if (priority && priority !== 'all') q = q.eq('priority', priority)
  if (country && country !== 'all') q = q.eq('country_code', country)
  if (search) q = q.ilike('subject', `%${search}%`)
  if (dateFrom) q = q.gte('created_at', new Date(dateFrom).toISOString())
  if (dateTo) {
    const end = new Date(dateTo); end.setHours(23, 59, 59, 999)
    q = q.lte('created_at', end.toISOString())
  }

  const [ticketsRes, slaRes] = await Promise.all([
    q,
    db.from('sla_rules').select('*').eq('is_active', true),
  ])

  return NextResponse.json({
    tickets: ticketsRes.data ?? [],
    slaRules: slaRes.data ?? [],
  })
}
