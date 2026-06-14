import type { CountryInfo } from '@/types'
import { createAdminClient } from '@/lib/supabase/admin'

const CACHE_TTL_HOURS = 24

interface RestCountry {
  cca2: string
  name: { common: string }
  flag: string
  flags: { png: string; svg: string }
  currencies?: Record<string, { name: string; symbol: string }>
  idd?: { root: string; suffixes?: string[] }
  region: string
  subregion?: string
  languages?: Record<string, string>
}

export async function getCountryInfo(countryCode: string): Promise<CountryInfo | null> {
  const supabase = createAdminClient()

  // Check cache first
  const { data: cached } = await supabase
    .from('country_info_cache')
    .select('*')
    .eq('country_code', countryCode.toUpperCase())
    .single()

  if (cached) {
    const cachedAt = new Date(cached.cached_at)
    const hoursSinceCached = (Date.now() - cachedAt.getTime()) / (1000 * 60 * 60)
    if (hoursSinceCached < CACHE_TTL_HOURS) {
      return cached as CountryInfo
    }
  }

  // Fetch from REST Countries API
  try {
    const response = await fetch(
      `https://restcountries.com/v3.1/alpha/${countryCode.toUpperCase()}`,
      { next: { revalidate: 86400 } }
    )

    if (!response.ok) return cached as CountryInfo | null

    const [country] = (await response.json()) as RestCountry[]

    const currencies = country.currencies ? Object.values(country.currencies) : []
    const currencyCode = country.currencies ? Object.keys(country.currencies)[0] : null
    const languages = country.languages ? Object.values(country.languages) : []

    const callingCode = country.idd?.root
      ? `${country.idd.root}${country.idd.suffixes?.[0] ?? ''}`
      : null

    const countryInfo: CountryInfo = {
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

    // Upsert into cache
    await supabase.from('country_info_cache').upsert(countryInfo)

    return countryInfo
  } catch {
    return cached as CountryInfo | null
  }
}

export async function getAllCachedCountries(): Promise<CountryInfo[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('country_info_cache')
    .select('*')
    .order('name')
  return (data ?? []) as CountryInfo[]
}

export function getFlagImageUrl(countryCode: string): string {
  return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`
}

export const COMMON_COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
]
