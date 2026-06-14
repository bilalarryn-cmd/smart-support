import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Inbox, Clock, CheckSquare, AlertCircle, ArrowRight } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TicketStatusBadge, TicketPriorityBadge } from '@/components/shared/ticket-status-badge'
import { SlaIndicator } from '@/components/shared/sla-indicator'
import { formatRelativeTime } from '@/lib/utils'
import type { Ticket, SlaRule } from '@/types'

export default async function AgentDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [assignedRes, queueRes, slaRulesRes] = await Promise.all([
    supabase.from('tickets').select('*, category:ticket_categories(name, color), customer:user_profiles!customer_id(full_name)').eq('assigned_agent_id', user.id).not('status', 'in', '(resolved,closed)').order('created_at', { ascending: false }),
    supabase.from('tickets').select('*, category:ticket_categories(name, color), customer:user_profiles!customer_id(full_name)').is('assigned_agent_id', null).not('status', 'in', '(resolved,closed)').order('created_at', { ascending: false }),
    supabase.from('sla_rules').select('*').eq('is_active', true),
  ])

  const assigned = assignedRes.data ?? []
  const queue = queueRes.data ?? []
  const slaRules = (slaRulesRes.data ?? []) as SlaRule[]

  const highPriority = assigned.filter(t => t.priority === 'high')
  const slaBreached = assigned.filter(t => t.sla_breached)

  const getSlaRule = (priority: string) => slaRules.find(r => r.priority === priority) ?? null

  return (
    <div className="animate-slide-in">
      <PageHeader title="Agent Dashboard" subtitle="Manage your assigned tickets and queue" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="My Assigned" value={assigned.length} icon={CheckSquare} color="blue" />
        <StatCard title="Queue" value={queue.length} icon={Inbox} color="amber" />
        <StatCard title="High Priority" value={highPriority.length} icon={AlertCircle} color="red" />
        <StatCard title="SLA Breached" value={slaBreached.length} icon={Clock} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Assigned Tickets */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Tickets</CardTitle>
              <Link href="/agent/assigned">
                <Button variant="ghost" size="sm">View All <ArrowRight className="h-4 w-4" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {assigned.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No tickets assigned to you</p>
            ) : (
              <div className="space-y-3">
                {assigned.slice(0, 5).map((ticket: Ticket & { customer?: { full_name: string } }) => (
                  <Link
                    key={ticket.id}
                    href={`/agent/tickets/${ticket.id}`}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 truncate">{ticket.subject}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{ticket.customer?.full_name} · {formatRelativeTime(ticket.created_at)}</p>
                      <div className="mt-2">
                        <SlaIndicator ticket={ticket} slaRule={getSlaRule(ticket.priority)} compact />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <TicketPriorityBadge priority={ticket.priority} />
                      <TicketStatusBadge status={ticket.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Queue */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Unassigned Queue</CardTitle>
              <Link href="/agent/queue">
                <Button variant="ghost" size="sm">View All <ArrowRight className="h-4 w-4" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {queue.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">Queue is empty</p>
            ) : (
              <div className="space-y-3">
                {queue.slice(0, 5).map((ticket: Ticket & { customer?: { full_name: string } }) => (
                  <Link
                    key={ticket.id}
                    href={`/agent/tickets/${ticket.id}`}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 truncate">{ticket.subject}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{ticket.customer?.full_name} · {formatRelativeTime(ticket.created_at)}</p>
                    </div>
                    <TicketPriorityBadge priority={ticket.priority} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
