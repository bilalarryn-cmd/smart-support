'use client'

import React, { useState, useEffect } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Bell, MessageSquare, CheckCircle, Clock, Shield, Zap, Activity } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'

type NotifItem = {
  id: string
  type: 'reply' | 'resolved' | 'audit' | 'automation'
  title: string
  subtitle: string
  time: string
  icon: React.ElementType
  iconColor: string
  href?: string
}

type Ticket = { id: string; subject: string; ticket_number: number; status: string; updated_at: string; sla_due_at: string | null }
type Message = { id: string; content: string; created_at: string; ticket_id: string; sender?: { full_name: string; role: string } }
type AuditLog = { id: string; action: string; created_at: string; entity_id: string; actor?: { full_name: string; role: string } }
type AutoJob = { id: string; job_type: string; status: string; tickets_processed: number; actions_taken: number; created_at: string }

const actionLabels: Record<string, string> = {
  'ticket.created': 'Ticket submit hua',
  'ticket.assigned': 'Ticket agent ko assign hua',
  'ticket.updated': 'Ticket update hua',
  'ticket.closed': 'Ticket band hua',
  'ticket.resolved': 'Ticket resolve hua',
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotifItem[]>([])
  const [lastJob, setLastJob] = useState<AutoJob | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/customer/notifications')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setLoading(false); return }

        const tickets: Ticket[] = data.tickets ?? []
        const messages: Message[] = data.messages ?? []
        const auditLogs: AuditLog[] = data.auditLogs ?? []
        const autoJobs: AutoJob[] = data.autoJobs ?? []

        if (autoJobs.length > 0) setLastJob(autoJobs[0])

        const notifs: NotifItem[] = [
          // Admin/agent replies
          ...messages.map(m => {
            const ticket = tickets.find(t => t.id === m.ticket_id)
            return {
              id: 'msg-' + m.id,
              type: 'reply' as const,
              title: `${m.sender?.role === 'admin' ? 'Admin' : 'Agent'} ne reply kiya`,
              subtitle: ticket ? `#${ticket.ticket_number}: ${m.content.slice(0, 80)}` : m.content.slice(0, 80),
              time: m.created_at,
              icon: MessageSquare,
              iconColor: 'text-blue-600 bg-blue-50',
              href: ticket ? `/tickets/${ticket.id}` : undefined,
            }
          }),

          // Resolved / closed tickets
          ...tickets
            .filter(t => t.status === 'resolved' || t.status === 'closed')
            .map(t => ({
              id: 'status-' + t.id,
              type: 'resolved' as const,
              title: t.status === 'closed' ? '🔒 Ticket band ho gaya' : '✅ Ticket resolve ho gaya',
              subtitle: `#${t.ticket_number}: ${t.subject}`,
              time: t.updated_at,
              icon: CheckCircle,
              iconColor: 'text-emerald-600 bg-emerald-50',
              href: `/tickets/${t.id}`,
            })),

          // SLA warnings (from AutomationJobs + ticket sla_due_at)
          ...tickets
            .filter(t => t.sla_due_at && ['new', 'open', 'waiting_for_customer'].includes(t.status))
            .filter(t => {
              const hoursLeft = (new Date(t.sla_due_at!).getTime() - Date.now()) / (1000 * 60 * 60)
              return hoursLeft < 4 && hoursLeft > 0
            })
            .map(t => ({
              id: 'sla-' + t.id,
              type: 'automation' as const,
              title: '⚠️ SLA deadline qareeb hai',
              subtitle: `#${t.ticket_number}: ${t.subject} — 4 ghante se kam time bache hain`,
              time: t.updated_at,
              icon: Clock,
              iconColor: 'text-orange-600 bg-orange-50',
              href: `/tickets/${t.id}`,
            })),

          // AuditLog entries (actions ON user's tickets)
          ...auditLogs.map(a => {
            const ticket = tickets.find(t => t.id === a.entity_id)
            const actor = a.actor?.role === 'admin' ? 'Admin' : a.actor?.role === 'agent' ? 'Agent' : 'Aap ne'
            return {
              id: 'audit-' + a.id,
              type: 'audit' as const,
              title: `${actor}: ${actionLabels[a.action] ?? a.action}`,
              subtitle: ticket ? `#${ticket.ticket_number}: ${ticket.subject}` : 'Aapka ticket',
              time: a.created_at,
              icon: Activity,
              iconColor: 'text-violet-600 bg-violet-50',
              href: ticket ? `/tickets/${ticket.id}` : undefined,
            }
          }),
        ]
          .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
          .slice(0, 30)

        setItems(notifs)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="animate-slide-in max-w-3xl mx-auto">
      <PageHeader title="Notifications & Activity" subtitle="Aapke tickets ki tamam activity yahan dikh ti hai" />

      {/* AutomationJobs live banner */}
      <div className={`mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm border ${lastJob ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
        <Zap className="h-4 w-4 shrink-0" />
        <span>
          <strong>SLA Automation Active</strong>{' '}
          {lastJob
            ? `— Last check: ${formatRelativeTime(lastJob.created_at)} | ${lastJob.tickets_processed} tickets checked | ${lastJob.actions_taken} actions taken`
            : '— System aapke tickets monitor kar raha hai (Vercel pe har 15 min mein chalega)'}
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Abhi koi activity nahi</p>
            <p className="text-sm text-slate-400 mt-1">Ticket banao — sab activity yahan nazar ayegi</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-1 text-xs text-slate-400 px-1">
            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3 text-blue-500" /> Admin Reply</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-500" /> Status Change</span>
            <span className="flex items-center gap-1"><Activity className="h-3 w-3 text-violet-500" /> Audit Log</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-orange-500" /> SLA Alert</span>
          </div>

          {items.map(n => {
            const Icon = n.icon
            const card = (
              <div className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                <div className={`rounded-xl p-2.5 shrink-0 ${n.iconColor}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{n.subtitle}</p>
                </div>
                <p className="text-xs text-slate-400 shrink-0 mt-0.5">{formatRelativeTime(n.time)}</p>
              </div>
            )
            return n.href
              ? <Link key={n.id} href={n.href}>{card}</Link>
              : <div key={n.id}>{card}</div>
          })}
        </div>
      )}

      <div className="mt-6 flex items-center gap-2 text-xs text-slate-400 justify-center">
        <Shield className="h-3.5 w-3.5" />
        <span>Aapke tickets automatically monitor ho rahe hain — SLA breach pe admin ko alert milta hai</span>
      </div>
    </div>
  )
}
