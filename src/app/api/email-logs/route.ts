import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'

async function getAdminFromCookie() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token) return null
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString())
    if (payload.role !== 'admin' || payload.exp < Date.now()) return null
    return payload
  } catch { return null }
}

export async function GET(request: NextRequest) {
  const admin = await getAdminFromCookie()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const offset = (page - 1) * limit

  const db = createAdminClient()
  const { data, count, error } = await db
    .from('email_logs')
    .select('*, ticket:tickets(ticket_number, subject)', { count: 'exact' })
    .order('sent_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, total: count ?? 0, page, limit })
}
