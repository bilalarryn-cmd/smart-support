import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { BarChart3, TrendingUp, Clock, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AnalyticsCharts } from '@/components/admin/analytics-charts'

export default async function AdminAnalyticsPage() {
  const supabase = createAdminClient()
  
  

  const [ticketsRes, emailRes, agentRes] = await Promise.all([
    supabase.from('tickets').select('id, status, priority, category_id, assigned_agent_id, first_response_at, created_at, sla_breached, country_code, category:ticket_categories(name), assigned_agent:user_profiles!assigned_agent_id(full_name)'),
    supabase.from('email_logs').select('status, template_type, sent_at'),
    supabase.from('user_profiles').select('id, full_name, role'),
  ])

  const tickets = ticketsRes.data ?? []
  const emails = emailRes.data ?? []
  const users = agentRes.data ?? []

  const total = tickets.length
  const open = tickets.filter((t: { status: string }) => ['new', 'open'].includes(t.status)).length
  const resolved = tickets.filter((t: { status: string }) => t.status === 'resolved').length
  const closed = tickets.filter((t: { status: string }) => t.status === 'closed').length
  const highPriority = tickets.filter((t: { priority: string }) => t.priority === 'high').length
  const slaBreaches = tickets.filter((t: { sla_breached: boolean }) => t.sla_breached).length

  const withResponse = tickets.filter((t: { first_response_at: string | null; created_at: string }) => t.first_response_at)
  const avgResponseHours = withResponse.length > 0
    ? withResponse.reduce((sum: number, t: { first_response_at: string; created_at: string }) => {
        return sum + (new Date(t.first_response_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60)
      }, 0) / withResponse.length
    : 0

  // By status
  const statusCounts: Record<string, number> = {}
  tickets.forEach((t: { status: string }) => { statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1 })

  // By priority
  const priorityCounts: Record<string, number> = {}
  tickets.forEach((t: { priority: string }) => { priorityCounts[t.priority] = (priorityCounts[t.priority] ?? 0) + 1 })

  // By category
  const categoryCounts: Record<string, number> = {}
  tickets.forEach((t: { category?: { name: string }[] }) => {
    const cat = Array.isArray(t.category) ? t.category[0] : t.category
    const name = (cat as { name?: string } | undefined)?.name ?? 'Uncategorized'
    categoryCounts[name] = (categoryCounts[name] ?? 0) + 1
  })

  // Tickets over last 14 days
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i))
    return d.toISOString().split('T')[0]
  })
  const ticketsPerDay: Record<string, number> = {}
  tickets.forEach((t: { created_at: string }) => {
    const day = t.created_at.split('T')[0]
    if (last14.includes(day)) ticketsPerDay[day] = (ticketsPerDay[day] ?? 0) + 1
  })
  const ticketsOverTime = last14.map(d => ({ date: d, count: ticketsPerDay[d] ?? 0 }))

  const agents = users.filter((u: { role: string }) => u.role === 'agent')
  const agentPerformance = agents.map((a: { id: string; full_name: string }) => {
    const assigned = tickets.filter((t: { assigned_agent_id: string | null }) => t.assigned_agent_id === a.id)
    const agentResolved = assigned.filter((t: { status: string }) => ['resolved', 'closed'].includes(t.status))
    const withFirstResp = assigned.filter((t: { first_response_at: string | null }) => t.first_response_at)
    const avgResp = withFirstResp.length > 0
      ? withFirstResp.reduce((s: number, t: { first_response_at: string; created_at: string }) =>
          s + (new Date(t.first_response_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60), 0
        ) / withFirstResp.length
      : 0
    return { agent_id: a.id, agent_name: a.full_name, assigned: assigned.length, resolved: agentResolved.length, avg_response_hours: Math.round(avgResp * 10) / 10 }
  })

  // By country
  const countryCounts: Record<string, number> = {}
  tickets.forEach((t: { country_code: string | null }) => {
    if (t.country_code) countryCounts[t.country_code] = (countryCounts[t.country_code] ?? 0) + 1
  })

  const emailStats = {
    total: emails.length,
    sent: emails.filter((e: { status: string }) => e.status === 'sent').length,
    failed: emails.filter((e: { status: string }) => e.status === 'failed').length,
    bounced: emails.filter((e: { status: string }) => e.status === 'bounced').length,
  }

  const analyticsData = {
    totalTickets: total,
    openTickets: open,
    closedTickets: closed,
    resolvedTickets: resolved,
    highPriorityTickets: highPriority,
    slaBreaches,
    avgResponseTimeHours: Math.round(avgResponseHours * 10) / 10,
    ticketsByStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
    ticketsByPriority: Object.entries(priorityCounts).map(([priority, count]) => ({ priority, count })),
    ticketsByCategory: Object.entries(categoryCounts).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    ticketsByCountry: Object.entries(countryCounts).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    agentPerformance,
    emailStats,
    ticketsOverTime,
  }

  return (
    <div className="animate-slide-in">
      <PageHeader title="Analytics" subtitle="Platform performance and insights" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Tickets" value={total} icon={BarChart3} color="blue" />
        <StatCard title="Open" value={open} icon={TrendingUp} color="amber" />
        <StatCard title="SLA Breaches" value={slaBreaches} icon={Clock} color="red" />
        <StatCard title="Avg Response" value={`${avgResponseHours.toFixed(1)}h`} icon={Users} color="green" />
      </div>

      <AnalyticsCharts data={analyticsData} />
    </div>
  )
}
