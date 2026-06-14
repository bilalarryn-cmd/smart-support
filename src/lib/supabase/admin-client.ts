import { createBrowserClient } from '@supabase/ssr'

export function createAdminAuthClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: 'sb-admin-auth',
      },
    }
  )
}
