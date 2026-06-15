import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('ticket_internal_notes')
    .select('*, author:user_profiles(*)')
    .eq('ticket_id', id)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!body.content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('ticket_internal_notes')
    .insert({ ticket_id: id, author_id: user.id, content: body.content })
    .select('*, author:user_profiles(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.from('audit_logs').insert({
    user_id: user.id,
    action: 'ticket.note_added',
    entity_type: 'ticket',
    entity_id: id,
    new_values: { note_id: data.id },
  })

  return NextResponse.json(data, { status: 201 })
}
