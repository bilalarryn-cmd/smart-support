import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { parseAdminToken } from '@/lib/admin-auth'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Admin routes: use admin_token cookie only ──
  const adminToken = request.cookies.get('admin_token')?.value
  const adminPayload = adminToken ? parseAdminToken(adminToken) : null

  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin-login')) {
    if (!adminPayload) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin-login'
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }

  if (pathname === '/admin-login') {
    if (adminPayload) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/dashboard'
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }

  // ── Regular user routes: use Supabase session ──
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith('http')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  let user: { user_metadata?: { role?: string } } | null = null
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch {
    // Network error in Edge runtime — fall through; server layouts handle auth
    return supabaseResponse
  }

  const publicPaths = ['/login', '/admin-login', '/signup', '/forgot-password', '/reset-password', '/api/health', '/api/cron', '/api/categories', '/api/admin']
  const isPublicPath = publicPaths.some(p => pathname.startsWith(p))

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const getRole = (u: typeof user) => (u?.user_metadata?.role as string) ?? 'customer'

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const role = getRole(user)
    const url = request.nextUrl.clone()
    if (role === 'agent') url.pathname = '/agent/dashboard'
    else url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (user) {
    const role = getRole(user)
    if (pathname.startsWith('/agent') && !['agent', 'admin'].includes(role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
