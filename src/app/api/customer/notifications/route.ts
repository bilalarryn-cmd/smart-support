import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  const [ticketsRes, messagesRes] = await Promise.all([
    db
      .from('tickets')
      .select('id, ticket_number, subject, status, priority, created_at, updated_at')
      .eq('customer_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20),
    db
      .from('ticket_messages')
      .select('id, content, created_at, ticket_id, sender:user_profiles!sender_id(role)')
      .neq('sender_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const userTicketIds = new Set((ticketsRes.data ?? []).map((t: { id: string }) => t.id))
  const filteredMessages = (messagesRes.data ?? []).filter((m: { ticket_id: string }) => userTicketIds.has(m.ticket_id))

  return NextResponse.json({
    tickets: ticketsRes.data ?? [],
    messages: filteredMessages,
  })
}
