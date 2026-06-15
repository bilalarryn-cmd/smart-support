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

export async function GET(request: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')
  const search = searchParams.get('search')
  const db = createAdminClient()

  let q = db.from('user_profiles').select('*').order('created_at', { ascending: false })
  if (role && role !== 'all') q = q.eq('role', role)
  if (search) q = q.ilike('full_name', `%${search}%`)
  const { data } = await q

  return NextResponse.json({ users: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId, updates } = await request.json()
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const db = createAdminClient()
  const { error } = await db.from('user_profiles').update(updates).eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
