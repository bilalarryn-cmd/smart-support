import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TicketCheck, Users, AlertCircle, CheckCircle, Clock, Mail, Cpu, ArrowRight, Plus, Activity, Timer } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TicketStatusBadge, TicketPriorityBadge } from '@/components/shared/ticket-status-badge'
import { SlaIndicator } from '@/components/shared/sla-indicator'
import { formatRelativeTime } from '@/lib/utils'
import type { Ticket, SlaRule } from '@/types'

export default async function AdminDashboardPage() {
  const supabase = createAdminClient()
  
  

  const [ticketsRes, usersRes, slaRulesRes, emailRes, autoRes, auditRes] = await Promise.all([
    supabase.from('tickets').select('*, customer:user_profiles!customer_id(full_name), category:ticket_categories(name, color)').order('created_at', { ascending: false }),
    supabase.from('user_profiles').select('id, role, is_active'),
    supabase.from('sla_rules').select('*').eq('is_active', true),
    supabase.from('email_logs').select('status').gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('automation_jobs').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('audit_logs').select('*, user:user_profiles(full_name)').order('created_at', { ascending: false }).limit(8),
  ])

  const tickets = ticketsRes.data ?? []
  const users = usersRes.data ?? []
  const slaRules = (slaRulesRes.data ?? []) as SlaRule[]

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => ['new', 'open'].includes(t.status)).length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    high: tickets.filter(t => t.priority === 'high').length,
    breached: tickets.filter(t => t.sla_breached).length,
    customers: users.filter((u: { role: string }) => u.role === 'customer').length,
    agents: users.filter((u: { role: string }) => u.role === 'agent').length,
  }

  const emailSent = (emailRes.data ?? []).filter((e: { status: string }) => e.status === 'sent').length

  const withResponse = tickets.filter((t: { first_response_at: string | null }) => t.first_response_at)
  const avgResponseHours = withResponse.length > 0
    ? (withResponse.reduce((sum: number, t: { first_response_at: string; created_at: string }) =>
        sum + (new Date(t.first_response_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60), 0
      ) / withResponse.length).toFixed(1)
    : '—'

  const getSlaRule = (priority: string) => slaRules.find(r => r.priority === priority) ?? null
  const auditLogs = auditRes.data ?? []

  return (
    <div className="animate-slide-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Platform-wide overview and management</p>
        </div>
        <Link href="/admin/tickets">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl shadow-sm">
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>
        </Link>
      </div>

      {/* Solid colored stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <StatCard title="Open Tickets" value={stats.open} icon={Clock} color="blue" variant="solid" />
        <StatCard title="High Priority" value={stats.high} icon={AlertCircle} color="amber" variant="solid" />
        <StatCard title="SLA Breaches" value={stats.breached} icon={AlertCircle} color="red" variant="solid" />
        <StatCard title="Resolved" value={stats.resolved} icon={CheckCircle} color="green" variant="solid" />
      </div>

      {/* Light stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Tickets" value={stats.total} icon={TicketCheck} color="slate" />
        <StatCard title="Avg Response Time" value={avgResponseHours === '—' ? '—' : `${avgResponseHours}h`} icon={Timer} color="blue" subtitle="First response" />
        <StatCard title="Customers" value={stats.customers} icon={Users} color="purple" />
        <StatCard title="Emails Today" value={emailSent} icon={Mail} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content — 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Tickets</CardTitle>
                <Link href="/admin/tickets">
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1">
                    View All <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tickets.slice(0, 6).map((ticket: Ticket & { customer?: { full_name: string } }) => (
                  <Link
                    key={ticket.id}
                    href={`/agent/tickets/${ticket.id}`}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 truncate">{ticket.subject}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{ticket.customer?.full_name} · {formatRelativeTime(ticket.created_at)}</p>
                      <div className="mt-1.5">
                        <SlaIndicator ticket={ticket} slaRule={getSlaRule(ticket.priority)} compact />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <TicketPriorityBadge priority={ticket.priority} />
                      <TicketStatusBadge status={ticket.status} />
                    </div>
                  </Link>
                ))}
                {tickets.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-8">No tickets yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Automation Jobs</CardTitle>
                <Link href="/admin/automation-logs">
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1">
                    View All <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {(autoRes.data ?? []).length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">No automation jobs yet</p>
              ) : (
                <div className="space-y-2">
                  {(autoRes.data ?? []).map((job: { id: string; job_type: string; status: string; actions_taken: number; tickets_processed: number; created_at: string }) => (
                    <div key={job.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                      <Cpu className="h-4 w-4 text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700">{job.job_type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-slate-400">{job.tickets_processed} processed · {job.actions_taken} actions</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : job.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {job.status}
                        </span>
                        <span className="text-xs text-slate-400">{formatRelativeTime(job.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed — right sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <CardTitle>Activity Feed</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">No recent activity</p>
              ) : (
                <div className="space-y-4">
                  {auditLogs.map((log: { id: string; action: string; entity_type: string; created_at: string; user?: { full_name: string } }) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 leading-snug">
                          <span className="font-medium">{log.user?.full_name ?? 'System'}</span>
                          {' '}{log.action.replace(/_/g, ' ')}{' '}
                          <span className="text-slate-400 text-xs">{log.entity_type}</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{formatRelativeTime(log.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
