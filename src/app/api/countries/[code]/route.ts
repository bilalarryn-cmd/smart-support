import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CACHE_TTL_HOURS = 24

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const countryCode = code.toUpperCase()
  const supabase = createAdminClient()

  // Check cache first
  const { data: cached } = await supabase
    .from('country_info_cache')
    .select('*')
    .eq('country_code', countryCode)
    .single()

  if (cached) {
    const hoursSince = (Date.now() - new Date(cached.cached_at).getTime()) / (1000 * 60 * 60)
    if (hoursSince < CACHE_TTL_HOURS) {
      return NextResponse.json(cached)
    }
  }

  // Fetch from REST Countries API
  try {
    const res = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}`)
    if (!res.ok) return cached ? NextResponse.json(cached) : NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [country] = await res.json()
    const currencies = country.currencies ? Object.values(country.currencies) as { name: string }[] : []
    const currencyCode = country.currencies ? Object.keys(country.currencies)[0] : null
    const languages = country.languages ? Object.values(country.languages) as string[] : []
    const callingCode = country.idd?.root ? `${country.idd.root}${country.idd.suffixes?.[0] ?? ''}` : null

    const info = {
      country_code: country.cca2,
      name: country.name.common,
      flag_emoji: country.flag,
      flag_url: country.flags?.png ?? null,
      currency_code: currencyCode,
      currency_name: currencies[0]?.name ?? null,
      calling_code: callingCode,
      region: country.region,
      subregion: country.subregion ?? null,
      language: languages[0] ?? null,
      cached_at: new Date().toISOString(),
    }

    await supabase.from('country_info_cache').upsert(info)
    return NextResponse.json(info)
  } catch {
    if (cached) return NextResponse.json(cached)
    return NextResponse.json({ error: 'Failed to fetch country info' }, { status: 500 })
  }
}
