import { createClient } from '@supabase/supabase-js'

function getValidUrl(val?: string) {
  try { new URL(val ?? ''); return val! } catch { return 'https://placeholder.supabase.co' }
}

export function createAdminClient() {
  return createClient(
    getValidUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
