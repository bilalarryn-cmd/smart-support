import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyTeam } from '@/lib/email/resend'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (user.user_metadata?.role as string) ?? 'customer'
  const db = createAdminClient()

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = (page - 1) * limit

  let query = db
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
  const db = createAdminClient()

  const { data: slaRule } = await db
    .from('sla_rules')
    .select('resolution_hours')
    .eq('priority', body.priority ?? 'medium')
    .eq('is_active', true)
    .single()

  const slaDueAt = slaRule
    ? new Date(Date.now() + slaRule.resolution_hours * 60 * 60 * 1000).toISOString()
    : null

  // Generate ticket number manually
  const { data: lastTicket } = await db
    .from('tickets')
    .select('ticket_number')
    .order('ticket_number', { ascending: false })
    .limit(1)
    .single()
  const ticketNumber = (lastTicket?.ticket_number ?? 999) + 1

  const { data, error } = await db.from('tickets').insert({
    ticket_number: ticketNumber,
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

  // Ticket-created notification (fire-and-forget).
  // The creator does NOT receive a confirmation of their own ticket — only
  // the support team (admins + agents) is notified, excluding the creator.
  try {
    await notifyTeam({ subject: `Ticket #${data.ticket_number} Created — ${data.subject}`, html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f0f4ff;padding:20px"><div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden"><div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:24px;text-align:center"><h1 style="color:white;margin:0;font-size:20px">🎯 Smart Support — New Ticket</h1></div><div style="padding:24px"><p>A new ticket has been created.</p><div style="background:#f8faff;border:1px solid #e0e7ff;border-radius:12px;padding:16px"><h3 style="color:#1e40af;margin:0 0 8px">Ticket #${data.ticket_number}</h3><p style="font-weight:600">${data.subject}</p></div><p><a href="${process.env.APP_URL ?? 'https://smart-support-beta.vercel.app'}/agent/tickets/${data.id}" style="display:inline-block;background:#1e40af;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Open in Queue</a></p></div></div></body></html>`, ticketId: data.id, templateType: 'ticket_created', excludeUserId: user.id })
  } catch { /* email failure should not block ticket creation */ }

  return NextResponse.json(data, { status: 201 })
}
