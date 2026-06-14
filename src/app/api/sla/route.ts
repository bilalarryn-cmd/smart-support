import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const priority = searchParams.get('priority') ?? 'medium'

  const db = createAdminClient()
  const { data } = await db
    .from('sla_rules')
    .select('*')
    .eq('priority', priority)
    .eq('is_active', true)
    .single()

  if (!data) return NextResponse.json(null)
  return NextResponse.json(data)
}
