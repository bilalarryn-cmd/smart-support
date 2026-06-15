import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailWithTemplate, buildAgentReplyHtml } from '@/lib/email/resend'

async function getCustomerEmail(customerId: string): Promise<string> {
  const db = createAdminClient()
  const { data } = await db.auth.admin.getUserById(customerId)
  return data.user?.email ?? ''
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('ticket_messages')
    .select('*, sender:user_profiles(*)')
    .eq('ticket_id', id)
    .eq('is_internal', false)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const db = createAdminClient()

  const { data, error } = await db
    .from('ticket_messages')
    .insert({
      ticket_id: id,
      sender_id: user.id,
      content: body.content,
      is_internal: body.is_internal ?? false,
    })
    .select('*, sender:user_profiles(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Audit log for agent reply
  const senderRole = (user.user_metadata?.role as string) ?? 'customer'
  if (senderRole !== 'customer' && !body.is_internal) {
    await db.from('audit_logs').insert({
      user_id: user.id,
      action: 'agent.reply_added',
      entity_type: 'ticket',
      entity_id: id,
      new_values: { message_id: data.id, content: body.content.slice(0, 100) },
    })
  }

  // Send email to customer when agent/admin replies
  if (senderRole !== 'customer' && !body.is_internal) {
    const { data: ticket } = await db
      .from('tickets')
      .select('*, customer:user_profiles!customer_id(*)')
      .eq('id', id).single()

    if (ticket) {
      const customerEmail = await getCustomerEmail(ticket.customer_id)
      const customerName = (ticket.customer as { full_name?: string })?.full_name ?? 'Customer'
      const senderName = (data.sender as { full_name?: string })?.full_name ?? 'Support Team'

      if (customerEmail) {
        await sendEmailWithTemplate({
          to: customerEmail,
          toName: customerName,
          subject: `New Reply — Ticket #${ticket.ticket_number}: ${ticket.subject}`,
          html: buildAgentReplyHtml(ticket, body.content, senderName),
          ticketId: id,
          templateType: 'agent_reply',
        })
      }

      // Also update ticket status to open if it was new
      if (ticket.status === 'new') {
        await db.from('tickets').update({ status: 'open' }).eq('id', id)
      }
    }
  }

  return NextResponse.json(data, { status: 201 })
}
