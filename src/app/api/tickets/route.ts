import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? 'customer'

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = (page - 1) * limit

  let query = supabase
    .from('tickets')
    .select('*, category:ticket_categories(name, color), customer:user_profiles!customer_id(full_name), assigned_agent:user_profiles!assigned_agent_id(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (role === 'customer') query = query.eq('customer_id', user.id)
  if (role === 'agent') query = query.eq('assigned_agent_id', user.id)
  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data: slaRule } = await supabase
    .from('sla_rules')
    .select('resolution_hours')
    .eq('priority', body.priority ?? 'medium')
    .eq('is_active', true)
    .single()

  const slaDueAt = slaRule
    ? new Date(Date.now() + slaRule.resolution_hours * 60 * 60 * 1000).toISOString()
    : null

  const { data, error } = await supabase.from('tickets').insert({
    subject: body.subject,
    description: body.description,
    priority: body.priority ?? 'medium',
    category_id: body.category_id ?? null,
    country_code: body.country_code ?? 'US',
    customer_id: user.id,
    status: 'new',
    sla_due_at: slaDueAt,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
