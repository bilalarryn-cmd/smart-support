import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendEmailWithTemplate,
  buildAgentReplyHtml,
  buildStatusChangeHtml,
  buildTicketClosedHtml,
} from '@/lib/email/resend'
import type { Ticket } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ticketId, type, content, agentName, newStatus, oldStatus } = body

    const supabase = createAdminClient()

    const { data: ticket } = await supabase
      .from('tickets')
      .select('*, customer:user_profiles!customer_id(*)')
      .eq('id', ticketId)
      .single()

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    // Get customer email from auth
    const { data: authUser } = await supabase.auth.admin.getUserById(ticket.customer_id)
    const customerEmail = authUser.user?.email
    const customerName = ticket.customer?.full_name ?? 'Customer'

    if (!customerEmail) return NextResponse.json({ error: 'No customer email' }, { status: 400 })

    let result = null

    if (type === 'created') {
      const subject = `Ticket #${ticket.ticket_number} Created — ${ticket.subject}`
      const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f0f4ff;padding:20px"><div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(59,130,246,.12)"><div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px;text-align:center"><h1 style="color:white;margin:0;font-size:22px">🎯 Smart Support</h1></div><div style="padding:32px"><h2 style="color:#1e40af">Your ticket has been created!</h2><p>Hi ${customerName},</p><p>We've received your support request and our team will be in touch shortly.</p><div style="background:#f8faff;border:1px solid #e0e7ff;border-radius:12px;padding:20px;margin:20px 0"><h3 style="color:#1e40af;margin:0 0 12px">Ticket #${ticket.ticket_number}</h3><p style="font-weight:600;color:#374151">${ticket.subject}</p></div><p><a href="${process.env.APP_URL}/tickets/${ticket.id}" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#3b82f6);color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">View Ticket</a></p></div></div></body></html>`
      result = await sendEmailWithTemplate({ to: customerEmail, toName: customerName, subject, html, ticketId, templateType: 'ticket_created' })
    } else if (type === 'agent_reply' && content) {
      const subject = `New Reply — Ticket #${ticket.ticket_number}`
      const html = buildAgentReplyHtml(ticket as Ticket, content, agentName ?? 'Support Team')
      result = await sendEmailWithTemplate({ to: customerEmail, toName: customerName, subject, html, ticketId, templateType: 'agent_reply' })
    } else if (type === 'status_change' && newStatus && oldStatus) {
      const subject = `Status Update — Ticket #${ticket.ticket_number}`
      const html = buildStatusChangeHtml(ticket as Ticket, newStatus, oldStatus)
      result = await sendEmailWithTemplate({ to: customerEmail, toName: customerName, subject, html, ticketId, templateType: 'status_change' })
    } else if (type === 'ticket_closed') {
      const subject = `Ticket #${ticket.ticket_number} Closed`
      const html = buildTicketClosedHtml(ticket as Ticket)
      result = await sendEmailWithTemplate({ to: customerEmail, toName: customerName, subject, html, ticketId, templateType: 'ticket_closed' })
    }

    return NextResponse.json({ success: true, result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
