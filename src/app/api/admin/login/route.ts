import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  const admin = createAdminClient()

  // Sign in with Supabase to verify credentials
  const { createClient } = await import('@supabase/supabase-js')
  const tempClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: authData, error } = await tempClient.auth.signInWithPassword({ email, password })
  if (error || !authData.user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Check role
  const role = (authData.user.user_metadata?.role as string) ?? 'customer'
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 })
  }

  // Sign out from temp client (don't affect browser session)
  await tempClient.auth.signOut()

  // Get profile
  const { data: profile } = await admin
    .from('user_profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single()

  // Create admin token payload
  const payload = {
    id: authData.user.id,
    email: authData.user.email,
    role: 'admin',
    full_name: profile?.full_name ?? 'Admin',
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24h
  }

  const token = Buffer.from(JSON.stringify(payload)).toString('base64')

  const response = NextResponse.json({ success: true, profile: payload })
  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24h
    path: '/',
  })

  return response
}
