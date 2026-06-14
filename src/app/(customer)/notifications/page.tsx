import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Bell, Ticket, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch recent ticket activity as notifications
  const { data: tickets } = await supabase
    .from('tickets')
    .select('*, category:ticket_categories(name)')
    .eq('customer_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(20)

  const { data: messages } = await supabase
    .from('ticket_messages')
    .select('*, ticket:tickets!inner(subject, ticket_number, customer_id)')
    .eq('is_internal', false)
    .eq('tickets.customer_id', user.id)
    .neq('sender_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  type Notification = {
    id: string
    type: 'reply' | 'status' | 'assigned'
    title: string
    subtitle: string
    time: string
    icon: typeof Bell
    iconColor: string
  }

  const notifications: Notification[] = [
    ...((messages ?? []) as Array<{ id: string; content: string; created_at: string; ticket?: { subject: string; ticket_number: number } }>).map(m => ({
      id: m.id,
      type: 'reply' as const,
      title: 'New reply on your ticket',
      subtitle: `#${m.ticket?.ticket_number}: ${m.ticket?.subject ?? 'Ticket'} — ${m.content.slice(0, 80)}...`,
      time: m.created_at,
      icon: MessageSquare,
      iconColor: 'text-blue-600 bg-blue-50',
    })),
    ...((tickets ?? []) as Array<{ id: string; subject: string; ticket_number: number; status: string; updated_at: string; created_at: string }>).filter(t => t.status === 'resolved').map(t => ({
      id: 'resolved-' + t.id,
      type: 'status' as const,
      title: 'Ticket resolved',
      subtitle: `#${t.ticket_number}: ${t.subject} has been resolved`,
      time: t.updated_at,
      icon: CheckCircle,
      iconColor: 'text-emerald-600 bg-emerald-50',
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 30)

  return (
    <div className="animate-slide-in max-w-3xl mx-auto">
      <PageHeader title="Notifications" subtitle="Stay up to date with your ticket activity" />

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No notifications yet</p>
            <p className="text-sm text-slate-400 mt-1">You&apos;ll be notified when there&apos;s activity on your tickets</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => {
            const Icon = n.icon
            return (
              <div key={n.id} className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className={`rounded-xl p-2.5 shrink-0 ${n.iconColor}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{n.subtitle}</p>
                </div>
                <p className="text-xs text-slate-400 shrink-0">{formatRelativeTime(n.time)}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
