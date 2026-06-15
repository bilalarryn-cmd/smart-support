import { createAdminClient } from '@/lib/supabase/admin'
import { deliverEmail } from '@/lib/email/transport'
import type { Ticket, UserProfile } from '@/types'

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'
// FROM must be a Resend-valid address: onboarding@resend.dev or a verified domain.
// A plain @gmail.com cannot be a Resend sender — use REPLY_TO for the Gmail inbox instead.
const FROM_EMAIL = process.env.EMAIL_FROM ?? 'Smart Support <onboarding@resend.dev>'
// Customer replies land in the admin's inbox. We look this up from the DB
// (whoever is the admin), and fall back to EMAIL_REPLY_TO if none is found.
const REPLY_TO_FALLBACK = process.env.EMAIL_REPLY_TO || undefined

// Cache the admin email for a short time so we don't hit the DB on every send.
let _adminEmailCache: { email: string | undefined; at: number } | null = null
const ADMIN_EMAIL_TTL_MS = 5 * 60 * 1000 // 5 minutes

async function getAdminReplyTo(): Promise<string | undefined> {
  if (_adminEmailCache && Date.now() - _adminEmailCache.at < ADMIN_EMAIL_TTL_MS) {
    return _adminEmailCache.email ?? REPLY_TO_FALLBACK
  }
  try {
    const db = createAdminClient()
    // Oldest active admin = the one who set up the platform.
    const { data: admin } = await db
      .from('user_profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    let email: string | undefined
    if (admin?.id) {
      const { data: authUser } = await db.auth.admin.getUserById(admin.id)
      email = authUser.user?.email ?? undefined
    }
    _adminEmailCache = { email, at: Date.now() }
    return email ?? REPLY_TO_FALLBACK
  } catch {
    return REPLY_TO_FALLBACK
  }
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

async function logEmail({
  ticketId,
  recipientEmail,
  recipientName,
  subject,
  templateType,
  status,
  resendMessageId,
  errorMessage,
}: {
  ticketId?: string
  recipientEmail: string
  recipientName?: string
  subject: string
  templateType: string
  status: 'sent' | 'failed' | 'bounced'
  resendMessageId?: string
  errorMessage?: string
}) {
  const admin = createAdminClient()
  await admin.from('email_logs').insert({
    ticket_id: ticketId ?? null,
    recipient_email: recipientEmail,
    recipient_name: recipientName ?? null,
    subject,
    template_type: templateType,
    status,
    resend_message_id: resendMessageId ?? null,
    error_message: errorMessage ?? null,
    sent_at: new Date().toISOString(),
  })
}

function getTicketUrl(ticketId: string, role: 'customer' | 'agent' | 'admin') {
  if (role === 'admin' || role === 'agent') return `${APP_URL}/agent/tickets/${ticketId}`
  return `${APP_URL}/tickets/${ticketId}`
}

function baseTemplate(content: string, title: string) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f4ff; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(59,130,246,0.12); }
  .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px; text-align: center; }
  .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; }
  .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
  .body { padding: 32px; }
  .ticket-card { background: #f8faff; border: 1px solid #e0e7ff; border-radius: 12px; padding: 20px; margin: 20px 0; }
  .ticket-card h3 { margin: 0 0 12px; color: #1e40af; font-size: 16px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 2px; }
  .badge-blue { background: #dbeafe; color: #1d4ed8; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-yellow { background: #fef3c7; color: #92400e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .btn { display: inline-block; background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 20px 0; }
  .footer { background: #f8faff; padding: 24px 32px; text-align: center; border-top: 1px solid #e0e7ff; }
  .footer p { color: #6b7280; font-size: 12px; margin: 4px 0; }
  .divider { border: none; border-top: 1px solid #e0e7ff; margin: 24px 0; }
  p { color: #374151; line-height: 1.6; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>🎯 Smart Support</h1>
    <p>Smart Productivity and Automation Platform</p>
  </div>
  <div class="body">
    ${content}
  </div>
  <div class="footer">
    <p>Smart Productivity and Automation Platform</p>
    <p>This is an automated message. Please do not reply directly to this email.</p>
    <p><a href="${APP_URL}" style="color: #3b82f6;">Visit Dashboard</a></p>
  </div>
</div>
</body>
</html>`
}

export async function sendTicketCreatedEmail(ticket: Ticket, customer: UserProfile): Promise<EmailResult> {
  const subject = `Ticket #${ticket.ticket_number} Created — ${ticket.subject}`
  const html = baseTemplate(`
    <h2 style="color:#1e40af;margin:0 0 8px">Your ticket has been created!</h2>
    <p>Hi ${customer.full_name},</p>
    <p>We've received your support request and our team will be in touch soon.</p>
    <div class="ticket-card">
      <h3>Ticket #${ticket.ticket_number}</h3>
      <p style="margin:0 0 12px;color:#374151"><strong>${ticket.subject}</strong></p>
      <span class="badge badge-blue">Status: New</span>
      <span class="badge badge-${ticket.priority === 'high' ? 'red' : ticket.priority === 'medium' ? 'yellow' : 'blue'}">${ticket.priority.toUpperCase()} Priority</span>
    </div>
    <p>You'll receive email notifications when our team responds.</p>
    <a href="${getTicketUrl(ticket.id, 'customer')}" class="btn">View Ticket</a>
    <hr class="divider">
    <p style="font-size:13px;color:#6b7280">Ticket ID: ${ticket.id}</p>
  `, subject)

  try {
    const db = createAdminClient()
    const { data: authUser } = await db.auth.admin.getUserById(customer.id)
    const customerEmail = authUser.user?.email ?? ''
    if (!customerEmail) return { success: false, error: 'No email found for customer' }

    const toField = `${customer.full_name} <${customerEmail}>`
    const replyTo = await getAdminReplyTo()
    const { id, error } = await deliverEmail({
      from: FROM_EMAIL,
      to: toField,
      replyTo,
      subject,
      html,
    })

    const success = !error && !!id
    await logEmail({ ticketId: ticket.id, recipientEmail: customerEmail, recipientName: customer.full_name, subject, templateType: 'ticket_created', status: success ? 'sent' : 'failed', resendMessageId: id, errorMessage: error })
    return { success, messageId: id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await logEmail({ ticketId: ticket.id, recipientEmail: customer.id, recipientName: customer.full_name, subject, templateType: 'ticket_created', status: 'failed', errorMessage: msg })
    return { success: false, error: msg }
  }
}

export async function sendEmailWithTemplate({
  to,
  toName,
  subject,
  html,
  ticketId,
  templateType,
}: {
  to: string
  toName?: string
  subject: string
  html: string
  ticketId?: string
  templateType: string
}): Promise<EmailResult> {
  try {
    const replyTo = await getAdminReplyTo()
    const { id, error } = await deliverEmail({
      from: FROM_EMAIL,
      to: toName ? `${toName} <${to}>` : to,
      replyTo,
      subject,
      html,
    })

    const success = !error && !!id
    await logEmail({
      ticketId,
      recipientEmail: to,
      recipientName: toName,
      subject,
      templateType,
      status: success ? 'sent' : 'failed',
      resendMessageId: id,
      errorMessage: error,
    })
    return { success, messageId: id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await logEmail({ ticketId, recipientEmail: to, recipientName: toName, subject, templateType, status: 'failed', errorMessage: msg })
    return { success: false, error: msg }
  }
}

export function buildAgentReplyHtml(ticket: Ticket, replyContent: string, agentName: string): string {
  return baseTemplate(`
    <h2 style="color:#1e40af;margin:0 0 8px">New reply on your ticket</h2>
    <p>Our support agent <strong>${agentName}</strong> has replied to your ticket.</p>
    <div class="ticket-card">
      <h3>Ticket #${ticket.ticket_number}: ${ticket.subject}</h3>
      <div style="background:white;border-radius:8px;padding:16px;margin-top:12px;border-left:4px solid #3b82f6;">
        <p style="margin:0;white-space:pre-wrap;">${replyContent}</p>
      </div>
    </div>
    <a href="${getTicketUrl(ticket.id, 'customer')}" class="btn">View & Reply</a>
  `, `Reply on Ticket #${ticket.ticket_number}`)
}

export function buildStatusChangeHtml(ticket: Ticket, newStatus: string, oldStatus: string): string {
  const statusColors: Record<string, string> = {
    new: 'badge-blue', open: 'badge-green', waiting_for_customer: 'badge-yellow',
    resolved: 'badge-blue', closed: 'badge-blue'
  }
  return baseTemplate(`
    <h2 style="color:#1e40af;margin:0 0 8px">Ticket Status Updated</h2>
    <p>The status of your support ticket has been updated.</p>
    <div class="ticket-card">
      <h3>Ticket #${ticket.ticket_number}: ${ticket.subject}</h3>
      <p>Status changed from <span class="badge ${statusColors[oldStatus] ?? 'badge-blue'}">${oldStatus.replace(/_/g, ' ')}</span> to <span class="badge ${statusColors[newStatus] ?? 'badge-blue'}">${newStatus.replace(/_/g, ' ')}</span></p>
    </div>
    <a href="${getTicketUrl(ticket.id, 'customer')}" class="btn">View Ticket</a>
  `, `Status Update — Ticket #${ticket.ticket_number}`)
}

export function buildSlaWarningHtml(ticket: Ticket, hoursRemaining: number): string {
  return baseTemplate(`
    <h2 style="color:#d97706;margin:0 0 8px">⚠️ SLA Warning</h2>
    <p>A ticket is approaching its SLA deadline and requires immediate attention.</p>
    <div class="ticket-card">
      <h3>Ticket #${ticket.ticket_number}: ${ticket.subject}</h3>
      <p><strong style="color:#d97706;">⏰ ${hoursRemaining.toFixed(1)} hours remaining until SLA breach</strong></p>
      <span class="badge badge-yellow">${ticket.priority.toUpperCase()} Priority</span>
    </div>
    <a href="${getTicketUrl(ticket.id, 'agent')}" class="btn" style="background:linear-gradient(135deg,#d97706,#f59e0b)">View Ticket</a>
  `, `SLA Warning — Ticket #${ticket.ticket_number}`)
}

export function buildSlaBreachHtml(ticket: Ticket): string {
  return baseTemplate(`
    <h2 style="color:#dc2626;margin:0 0 8px">🚨 SLA Breached</h2>
    <p>A ticket has breached its SLA deadline. Immediate action required.</p>
    <div class="ticket-card">
      <h3>Ticket #${ticket.ticket_number}: ${ticket.subject}</h3>
      <p><strong style="color:#dc2626;">❌ SLA deadline has been missed</strong></p>
      <span class="badge badge-red">${ticket.priority.toUpperCase()} Priority</span>
    </div>
    <a href="${getTicketUrl(ticket.id, 'agent')}" class="btn" style="background:linear-gradient(135deg,#dc2626,#ef4444)">View Ticket Now</a>
  `, `SLA Breach — Ticket #${ticket.ticket_number}`)
}

export function buildTicketClosedHtml(ticket: Ticket): string {
  return baseTemplate(`
    <h2 style="color:#1e40af;margin:0 0 8px">✅ Ticket Resolved & Closed</h2>
    <p>Your support ticket has been closed. We hope we were able to help!</p>
    <div class="ticket-card">
      <h3>Ticket #${ticket.ticket_number}: ${ticket.subject}</h3>
      <span class="badge badge-blue">Closed</span>
    </div>
    <p>If you have further questions, please don't hesitate to open a new ticket.</p>
    <a href="${APP_URL}/tickets/new" class="btn">Open New Ticket</a>
  `, `Ticket #${ticket.ticket_number} Closed`)
}
