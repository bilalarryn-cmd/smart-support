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
    .from('tickets')
    .select('*, category:ticket_categories(*), customer:user_profiles!customer_id(*), assigned_agent:user_profiles!assigned_agent_id(*)')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Customer can only view their own ticket
  const role = (user.user_metadata?.role as string) ?? 'customer'
  if (role === 'customer' && data.customer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const updates: Record<string, unknown> = {}

  if (body.status !== undefined) {
    updates.status = body.status
    if (body.status === 'resolved') updates.resolved_at = new Date().toISOString()
    if (body.status === 'closed') updates.closed_at = new Date().toISOString()
  }
  if (body.priority !== undefined) updates.priority = body.priority
  if (body.assigned_agent_id !== undefined) updates.assigned_agent_id = body.assigned_agent_id
  if (body.subject !== undefined) updates.subject = body.subject
  if (body.description !== undefined) updates.description = body.description

  const db = createAdminClient()
  const { data, error } = await db
    .from('tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (user.user_metadata?.role as string) ?? 'customer'
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db = createAdminClient()
  const { error } = await db.from('tickets').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
