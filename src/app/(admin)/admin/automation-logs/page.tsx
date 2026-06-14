import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Cpu, CheckCircle, XCircle, Loader } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/stat-card'
import { formatDateTime, formatRelativeTime } from '@/lib/utils'
import type { AutomationJob } from '@/types'

export default async function AdminAutomationLogsPage() {
  const supabase = createAdminClient()
  
  

  const { data: jobs } = await supabase
    .from('automation_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const all = (jobs ?? []) as AutomationJob[]
  const completed = all.filter(j => j.status === 'completed').length
  const failed = all.filter(j => j.status === 'failed').length
  const totalActions = all.reduce((s, j) => s + j.actions_taken, 0)

  return (
    <div className="animate-slide-in">
      <PageHeader title="Automation Logs" subtitle="Cron job execution history" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Runs" value={all.length} icon={Cpu} color="blue" />
        <StatCard title="Completed" value={completed} icon={CheckCircle} color="green" />
        <StatCard title="Failed" value={failed} icon={XCircle} color="red" />
        <StatCard title="Total Actions" value={totalActions} icon={Loader} color="purple" />
      </div>

      <Card>
        <CardHeader><CardTitle>Job History</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {all.length === 0 ? (
              <p className="text-center text-slate-400 py-12">No automation jobs have run yet. Cron triggers every 15 minutes.</p>
            ) : all.map(job => (
              <div key={job.id} className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition-colors">
                <div className={`p-2.5 rounded-xl shrink-0 ${job.status === 'completed' ? 'bg-emerald-50' : job.status === 'failed' ? 'bg-red-50' : 'bg-blue-50'}`}>
                  {job.status === 'completed' ? <CheckCircle className="h-4 w-4 text-emerald-600" /> :
                   job.status === 'failed' ? <XCircle className="h-4 w-4 text-red-600" /> :
                   <Loader className="h-4 w-4 text-blue-600 animate-spin" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-semibold text-slate-800 text-sm">{job.job_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : job.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{job.tickets_processed} tickets processed</span>
                    <span>{job.actions_taken} actions taken</span>
                    {job.completed_at && (
                      <span>Duration: {Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)}s</span>
                    )}
                  </div>
                  {job.error_message && (
                    <p className="text-xs text-red-500 mt-1">{job.error_message}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-400">{formatRelativeTime(job.created_at)}</p>
                  <p className="text-xs text-slate-300">{formatDateTime(job.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
