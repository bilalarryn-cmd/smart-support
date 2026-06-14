import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import type { AuditLog, UserProfile } from '@/types'

export default async function AdminAuditLogsPage() {
  const supabase = createAdminClient()
  
  

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*, user:user_profiles(full_name, role)')
    .order('created_at', { ascending: false })
    .limit(200)

  const all = (logs ?? []) as (AuditLog & { user?: { full_name: string; role: string } })[]

  const actionColors: Record<string, string> = {
    'ticket.created': 'bg-blue-100 text-blue-700',
    'ticket.updated': 'bg-amber-100 text-amber-700',
    'ticket.closed': 'bg-slate-100 text-slate-700',
    'ticket.assigned': 'bg-purple-100 text-purple-700',
  }

  return (
    <div className="animate-slide-in">
      <PageHeader title="Audit Logs" subtitle="Complete system activity trail" />

      <Card>
        <CardHeader><CardTitle>Activity Log ({all.length} entries)</CardTitle></CardHeader>
        <CardContent>
          {all.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">No audit logs yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Entity</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Changes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {all.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                      <td className="py-3 px-4">
                        {log.user ? (
                          <div>
                            <p className="text-sm text-slate-700 font-medium">{log.user.full_name}</p>
                            <p className="text-xs text-slate-400 capitalize">{log.user.role}</p>
                          </div>
                        ) : <span className="text-slate-400 text-xs">System</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${actionColors[log.action] ?? 'bg-slate-100 text-slate-600'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs capitalize">{log.entity_type}</td>
                      <td className="py-3 px-4 text-xs text-slate-500 max-w-xs">
                        {log.new_values ? (
                          <code className="bg-slate-50 px-2 py-1 rounded text-xs block truncate">
                            {JSON.stringify(log.new_values).slice(0, 80)}
                          </code>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
