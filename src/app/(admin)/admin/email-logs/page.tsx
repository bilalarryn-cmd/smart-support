import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Mail, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/stat-card'
import { formatDateTime } from '@/lib/utils'
import type { EmailLog } from '@/types'

export default async function AdminEmailLogsPage() {
  const supabase = createAdminClient()
  
  

  const { data: logs } = await supabase
    .from('email_logs')
    .select('*, ticket:tickets(ticket_number, subject)')
    .order('sent_at', { ascending: false })
    .limit(200)

  const all = (logs ?? []) as (EmailLog & { ticket?: { ticket_number: number; subject: string } })[]
  const sent = all.filter(l => l.status === 'sent').length
  const failed = all.filter(l => l.status === 'failed').length
  const bounced = all.filter(l => l.status === 'bounced').length

  const templateLabels: Record<string, string> = {
    ticket_created: 'Ticket Created',
    agent_reply: 'Agent Reply',
    status_change: 'Status Change',
    sla_warning: 'SLA Warning',
    sla_breach: 'SLA Breach',
    ticket_closed: 'Ticket Closed',
    customer_reply: 'Customer Reply',
  }

  return (
    <div className="animate-slide-in">
      <PageHeader title="Email Logs" subtitle="Track all outbound email communications" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total" value={all.length} icon={Mail} color="blue" />
        <StatCard title="Sent" value={sent} icon={CheckCircle} color="green" />
        <StatCard title="Failed" value={failed} icon={XCircle} color="red" />
        <StatCard title="Bounced" value={bounced} icon={AlertCircle} color="amber" />
      </div>

      <Card>
        <CardHeader><CardTitle>Email History</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Recipient</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {all.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">No email logs yet</td>
                  </tr>
                ) : all.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                        log.status === 'sent' ? 'bg-emerald-100 text-emerald-700' :
                        log.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {log.status === 'sent' ? <CheckCircle className="h-3 w-3" /> : log.status === 'failed' ? <XCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="truncate text-slate-700">{log.subject}</p>
                      {log.error_message && <p className="text-xs text-red-500 truncate">{log.error_message}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        {templateLabels[log.template_type] ?? log.template_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">{log.recipient_email}</td>
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      {log.ticket ? `#${log.ticket.ticket_number}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">{formatDateTime(log.sent_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
