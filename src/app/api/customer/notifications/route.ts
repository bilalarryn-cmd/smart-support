import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  // User's tickets
  const { data: tickets } = await db
    .from('tickets')
    .select('id, subject, ticket_number, status, updated_at, sla_due_at')
    .eq('customer_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(20)

  const ticketIds = (tickets ?? []).map((t: { id: string }) => t.id)

  // Replies on user's tickets from others
  const { data: messages } = ticketIds.length > 0
    ? await db
        .from('ticket_messages')
        .select('id, content, created_at, ticket_id, sender:user_profiles!sender_id(full_name, role)')
        .in('ticket_id', ticketIds)
        .eq('is_internal', false)
        .neq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(15)
    : { data: [] }

  // AuditLogs for user's tickets
  const { data: auditLogs } = ticketIds.length > 0
    ? await db
        .from('audit_logs')
        .select('id, action, created_at, entity_id, new_values, actor:user_profiles!user_id(full_name, role)')
        .in('entity_id', ticketIds)
        .eq('entity_type', 'ticket')
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] }

  // AutomationJobs — last 3 runs
  const { data: autoJobs } = await db
    .from('automation_jobs')
    .select('id, job_type, status, tickets_processed, actions_taken, created_at, completed_at')
    .order('created_at', { ascending: false })
    .limit(3)

  return NextResponse.json({
    tickets: tickets ?? [],
    messages: messages ?? [],
    auditLogs: auditLogs ?? [],
    autoJobs: autoJobs ?? [],
  })
}
