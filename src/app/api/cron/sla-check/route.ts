import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendEmailWithTemplate,
  buildSlaWarningHtml,
  buildSlaBreachHtml,
  buildTicketClosedHtml,
} from '@/lib/email/resend'
import type { Ticket, SlaRule } from '@/types'

const AUTO_CLOSE_AFTER_HOURS = 72

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const jobId = crypto.randomUUID()
  const startedAt = new Date().toISOString()

  // Create job record
  await supabase.from('automation_jobs').insert({
    id: jobId,
    job_type: 'sla_check_and_automation',
    status: 'running',
    started_at: startedAt,
  })

  let ticketsProcessed = 0
  let actionsTotal = 0
  let errorMessage: string | null = null

  try {
    // Fetch active SLA rules
    const { data: slaRules } = await supabase
      .from('sla_rules')
      .select('*')
      .eq('is_active', true)

    const rules = (slaRules ?? []) as SlaRule[]

    // Fetch all open/non-closed tickets
    const { data: openTickets } = await supabase
      .from('tickets')
      .select('*, customer:user_profiles!customer_id(*), assigned_agent:user_profiles!assigned_agent_id(*)')
      .not('status', 'in', '(closed)')
      .not('sla_due_at', 'is', null)

    const tickets = (openTickets ?? []) as (Ticket & {
      customer?: { full_name: string }
      assigned_agent?: { full_name: string; id: string }
    })[]

    ticketsProcessed = tickets.length

    for (const ticket of tickets) {
      let actions = 0
      const now = new Date()

      // === AUTO-CLOSE RESOLVED TICKETS ===
      if (ticket.status === 'resolved' && ticket.resolved_at) {
        const resolvedAt = new Date(ticket.resolved_at)
        const hoursSinceResolved = (now.getTime() - resolvedAt.getTime()) / (1000 * 60 * 60)

        if (hoursSinceResolved >= AUTO_CLOSE_AFTER_HOURS) {
          await supabase.from('tickets').update({
            status: 'closed',
            closed_at: now.toISOString(),
          }).eq('id', ticket.id)

          // Notify customer
          const { data: authUser } = await supabase.auth.admin.getUserById(ticket.customer_id)
          const customerEmail = authUser.user?.email
          if (customerEmail) {
            await sendEmailWithTemplate({
              to: customerEmail,
              toName: ticket.customer?.full_name,
              subject: `Ticket #${ticket.ticket_number} Automatically Closed`,
              html: buildTicketClosedHtml(ticket),
              ticketId: ticket.id,
              templateType: 'ticket_closed_auto',
            })
          }

          await supabase.from('audit_logs').insert({
            action: 'ticket.auto_closed',
            entity_type: 'ticket',
            entity_id: ticket.id,
            new_values: { status: 'closed', reason: 'auto_close_after_resolution' },
          })

          actions++
          continue
        }
      }

      // Skip closed/resolved for SLA checks
      if (['closed', 'resolved'].includes(ticket.status)) continue
      if (!ticket.sla_due_at) continue

      const slaRule = rules.find(r => r.priority === ticket.priority)
      if (!slaRule) continue

      const dueAt = new Date(ticket.sla_due_at)
      const createdAt = new Date(ticket.created_at)
      const totalMs = dueAt.getTime() - createdAt.getTime()
      const elapsedMs = now.getTime() - createdAt.getTime()
      const percentage = (elapsedMs / totalMs) * 100

      const isBreached = now > dueAt
      const isWarning = !isBreached && percentage >= slaRule.warning_threshold

      // SLA escalations go to admins and the ticket's customer — not the agent.
      const escalationEmails: string[] = []

      const { data: admins } = await supabase.from('user_profiles').select('id').eq('role', 'admin').eq('is_active', true)
      for (const admin of (admins ?? [])) {
        const { data: adminAuth } = await supabase.auth.admin.getUserById(admin.id)
        if (adminAuth.user?.email) escalationEmails.push(adminAuth.user.email)
      }

      // Add the customer (ticket creator) so they know their ticket is at risk.
      const { data: custAuth } = await supabase.auth.admin.getUserById(ticket.customer_id)
      if (custAuth.user?.email) escalationEmails.push(custAuth.user.email)

      // === SLA BREACH ===
      if (isBreached && !ticket.sla_breached) {
        await supabase.from('tickets').update({ sla_breached: true }).eq('id', ticket.id)

        const subject = `🚨 SLA Breached — Ticket #${ticket.ticket_number}`
        const html = buildSlaBreachHtml(ticket)

        for (const recipient of escalationEmails) {
          await sendEmailWithTemplate({ to: recipient, subject, html, ticketId: ticket.id, templateType: 'sla_breach' })
        }

        await supabase.from('audit_logs').insert({
          action: 'ticket.sla_breached',
          entity_type: 'ticket',
          entity_id: ticket.id,
          new_values: { sla_breached: true, priority: ticket.priority },
        })

        actions++
      }

      // === SLA WARNING ===
      if (isWarning && !ticket.sla_warned) {
        await supabase.from('tickets').update({ sla_warned: true }).eq('id', ticket.id)

        const hoursRemaining = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60)
        const subject = `⚠️ SLA Warning — Ticket #${ticket.ticket_number}`
        const html = buildSlaWarningHtml(ticket, hoursRemaining)

        for (const recipient of escalationEmails) {
          await sendEmailWithTemplate({ to: recipient, subject, html, ticketId: ticket.id, templateType: 'sla_warning' })
        }

        actions++
      }

      actionsTotal += actions
    }

    // === DUPLICATE PREVENTION ===
    const dupeCheckNow = new Date()
    const oneHourAgo = new Date(dupeCheckNow.getTime() - 60 * 60 * 1000).toISOString()
    const { data: recentTickets } = await supabase
      .from('tickets')
      .select('customer_id, subject, id')
      .gte('created_at', oneHourAgo)
      .eq('status', 'new')
      .order('created_at')

    if (recentTickets) {
      const seen = new Map<string, string>()
      for (const t of recentTickets) {
        const key = `${t.customer_id}::${t.subject.toLowerCase().trim()}`
        if (seen.has(key)) {
          await supabase.from('audit_logs').insert({
            action: 'ticket.duplicate_detected',
            entity_type: 'ticket',
            entity_id: t.id,
            new_values: { duplicate_of: seen.get(key), subject: t.subject },
          })
          actionsTotal++
        } else {
          seen.set(key, t.id)
        }
      }
    }

    // Complete the job
    await supabase.from('automation_jobs').update({
      status: 'completed',
      tickets_processed: ticketsProcessed,
      actions_taken: actionsTotal,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId)

    return NextResponse.json({
      success: true,
      ticketsProcessed,
      actionsTotal,
      jobId,
    })

  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Unknown error'

    await supabase.from('automation_jobs').update({
      status: 'failed',
      tickets_processed: ticketsProcessed,
      actions_taken: actionsTotal,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId)

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// Also allow GET for Vercel cron
export async function GET(request: NextRequest) {
  return POST(request)
}
