import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseAdminToken } from '@/lib/admin-auth'

async function checkAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token) return null
  return parseAdminToken(token)
}

// POST: Create new agent user
export async function POST(request: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, full_name, password } = await request.json()
  if (!email || !full_name || !password) {
    return NextResponse.json({ error: 'email, full_name and password are required' }, { status: 400 })
  }

  const db = createAdminClient()

  // Create user via Supabase admin
  const { data: newUser, error: createError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: 'agent' },
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  // Create user_profiles row
  await db.from('user_profiles').upsert({
    id: newUser.user.id,
    full_name,
    role: 'agent',
    is_active: true,
  })

  return NextResponse.json({ id: newUser.user.id, email, full_name }, { status: 201 })
}

// DELETE: Demote agent to customer (remove agent role)
export async function DELETE(request: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { agentId } = await request.json()
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })

  const db = createAdminClient()
  const { error } = await db.from('user_profiles').update({ role: 'customer' }).eq('id', agentId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
