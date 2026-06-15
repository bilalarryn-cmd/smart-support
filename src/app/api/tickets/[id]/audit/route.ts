import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const db = createAdminClient()

  await db.from('audit_logs').insert({
    user_id: user.id,
    action: body.action,
    entity_type: 'ticket',
    entity_id: id,
    old_values: body.old_values ?? null,
    new_values: body.new_values ?? null,
  })

  return NextResponse.json({ success: true }, { status: 201 })
}
