import { createBrowserClient } from '@supabase/ssr'

function getValidUrl(val?: string) {
  try { new URL(val ?? ''); return val! } catch { return 'https://placeholder.supabase.co' }
}

export function createClient() {
  const url = getValidUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  return createBrowserClient(url, key)
}
