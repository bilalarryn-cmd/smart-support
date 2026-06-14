import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { AlertTriangle, Clock, User } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/stat-card'
import { TicketPriorityBadge, TicketStatusBadge } from '@/components/shared/ticket-status-badge'
import { SlaEscalationActions } from '@/components/admin/sla-escalation-actions'
import { formatRelativeTime, formatDateTime } from '@/lib/utils'
import type { Ticket, UserProfile } from '@/types'

export default async function SlaEscalationPage() {
  const db = createAdminClient()

  const [breachedRes, warningRes, agentsRes] = await Promise.all([
    db.from('tickets')
      .select('*, customer:user_profiles!customer_id(full_name), assigned_agent:user_profiles!assigned_agent_id(full_name)')
      .eq('sla_breached', true)
      .not('status', 'in', '(resolved,closed)')
      .order('sla_due_at', { ascending: true }),
    db.from('tickets')
      .select('*, customer:user_profiles!customer_id(full_name), assigned_agent:user_profiles!assigned_agent_id(full_name)')
      .eq('sla_warned', true)
      .eq('sla_breached', false)
      .not('status', 'in', '(resolved,closed)')
      .order('sla_due_at', { ascending: true })
      .limit(20),
    db.from('user_profiles').select('id, full_name').eq('role', 'agent').eq('is_active', true),
  ])

  const breached = (breachedRes.data ?? []) as (Ticket & { customer?: { full_name: string }; assigned_agent?: { full_name: string } })[]
  const warning = (warningRes.data ?? []) as (Ticket & { customer?: { full_name: string }; assigned_agent?: { full_name: string } })[]
  const agents = (agentsRes.data ?? []) as Pick<UserProfile, 'id' | 'full_name'>[]

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="SLA Escalation Management"
        subtitle="Breached and at-risk tickets requiring immediate attention"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="SLA Breached" value={breached.length} icon={AlertTriangle} color="red" variant="solid" />
        <StatCard title="SLA Warning" value={warning.length} icon={Clock} color="amber" variant="solid" />
        <StatCard title="Active Agents" value={agents.length} icon={User} color="blue" />
      </div>

      {/* Breached Tickets */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            SLA Breached ({breached.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {breached.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No breached SLA tickets — great job!</p>
          ) : (
            <div className="space-y-3">
              {breached.map(ticket => (
                <div key={ticket.id} className="flex items-start gap-4 p-4 bg-red-50 border border-red-100 rounded-2xl">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/agent/tickets/${ticket.id}`} className="font-semibold text-slate-800 hover:text-red-700 text-sm">
                        #{ticket.ticket_number}: {ticket.subject}
                      </Link>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>Customer: {ticket.customer?.full_name ?? 'Unknown'}</span>
                      <span>·</span>
                      <span>Agent: {ticket.assigned_agent?.full_name ?? 'Unassigned'}</span>
                      <span>·</span>
                      <span>Due: {ticket.sla_due_at ? formatDateTime(ticket.sla_due_at) : '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <TicketPriorityBadge priority={ticket.priority} />
                      <TicketStatusBadge status={ticket.status} />
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        Breached {ticket.sla_due_at ? formatRelativeTime(ticket.sla_due_at) : ''}
                      </span>
                    </div>
                  </div>
                  <SlaEscalationActions ticketId={ticket.id} currentPriority={ticket.priority} agents={agents} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warning Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <Clock className="h-5 w-5" />
            SLA Warning — At Risk ({warning.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {warning.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No tickets in warning state</p>
          ) : (
            <div className="space-y-3">
              {warning.map(ticket => (
                <div key={ticket.id} className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <div className="flex-1 min-w-0">
                    <Link href={`/agent/tickets/${ticket.id}`} className="font-semibold text-slate-800 hover:text-amber-700 text-sm">
                      #{ticket.ticket_number}: {ticket.subject}
                    </Link>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>Customer: {ticket.customer?.full_name ?? 'Unknown'}</span>
                      <span>·</span>
                      <span>Agent: {ticket.assigned_agent?.full_name ?? 'Unassigned'}</span>
                      <span>·</span>
                      <span>Due: {ticket.sla_due_at ? formatRelativeTime(ticket.sla_due_at) : '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <TicketPriorityBadge priority={ticket.priority} />
                      <TicketStatusBadge status={ticket.status} />
                    </div>
                  </div>
                  <SlaEscalationActions ticketId={ticket.id} currentPriority={ticket.priority} agents={agents} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
