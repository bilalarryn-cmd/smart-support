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

// GET: List agents with ticket counts
export async function GET(request: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const db = createAdminClient()

  let q = db.from('user_profiles').select('*').eq('role', 'agent').order('full_name')
  if (search) q = q.ilike('full_name', `%${search}%`)
  const { data: agentData } = await q

  const agents = agentData ?? []
  const withCounts = await Promise.all(
    agents.map(async (agent: { id: string }) => {
      const { count } = await db
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_agent_id', agent.id)
        .not('status', 'in', '(resolved,closed)')
      return { ...agent, ticket_count: count ?? 0 }
    })
  )

  return NextResponse.json({ agents: withCounts })
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

  const { data: newUser, error: createError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: 'agent' },
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  await db.from('user_profiles').upsert({
    id: newUser.user.id,
    full_name,
    role: 'agent',
    is_active: true,
  })

  return NextResponse.json({ id: newUser.user.id, email, full_name }, { status: 201 })
}

// PATCH: Toggle active status
export async function PATCH(request: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { agentId, is_active } = await request.json()
  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 })

  const db = createAdminClient()
  const { error } = await db.from('user_profiles').update({ is_active }).eq('id', agentId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// DELETE: Demote agent to customer
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
