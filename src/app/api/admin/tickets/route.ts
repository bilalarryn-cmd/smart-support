import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseAdminToken } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token || !parseAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const categoryId = searchParams.get('category_id')
  const agentId = searchParams.get('agent_id')
  const country = searchParams.get('country')
  const search = searchParams.get('search')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')

  const db = createAdminClient()

  let q = db
    .from('tickets')
    .select('*, customer:user_profiles!customer_id(*), assigned_agent:user_profiles!assigned_agent_id(*), category:ticket_categories(*)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (status && status !== 'all') q = q.eq('status', status)
  if (priority && priority !== 'all') q = q.eq('priority', priority)
  if (categoryId && categoryId !== 'all') q = q.eq('category_id', categoryId)
  if (agentId === 'unassigned') q = q.is('assigned_agent_id', null)
  else if (agentId && agentId !== 'all') q = q.eq('assigned_agent_id', agentId)
  if (country && country !== 'all') q = q.eq('country_code', country)
  if (search) q = q.ilike('subject', `%${search}%`)

  if (dateFrom && dateTo) {
    const from = new Date(dateFrom)
    const to = new Date(dateTo)
    const effectiveFrom = from <= to ? dateFrom : dateTo
    const effectiveTo = from <= to ? dateTo : dateFrom
    q = q.gte('created_at', new Date(effectiveFrom).toISOString())
    const end = new Date(effectiveTo)
    end.setHours(23, 59, 59, 999)
    q = q.lte('created_at', end.toISOString())
  } else if (dateFrom) {
    q = q.gte('created_at', new Date(dateFrom).toISOString())
  } else if (dateTo) {
    const end = new Date(dateTo)
    end.setHours(23, 59, 59, 999)
    q = q.lte('created_at', end.toISOString())
  }

  const [ticketsRes, catsRes, agentsRes, slaRes] = await Promise.all([
    q,
    db.from('ticket_categories').select('*').eq('is_active', true),
    db.from('user_profiles').select('*').eq('role', 'agent'),
    db.from('sla_rules').select('*').eq('is_active', true),
  ])

  return NextResponse.json({
    tickets: ticketsRes.data ?? [],
    categories: catsRes.data ?? [],
    agents: agentsRes.data ?? [],
    slaRules: slaRes.data ?? [],
  })
}
