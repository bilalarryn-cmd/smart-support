import { describe, it, expect } from 'vitest'
import { getFlagImageUrl, COMMON_COUNTRIES } from '@/lib/countries/api'

// Tests the REST Countries API response parsing logic
// (mirrors the logic in src/lib/countries/api.ts — no Supabase dependency)

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

function parseCountryResponse(country: RestCountry) {
  const currencies   = country.currencies ? Object.values(country.currencies) : []
  const currencyCode = country.currencies ? Object.keys(country.currencies)[0] : null
  const languages    = country.languages  ? Object.values(country.languages)  : []
  const callingCode  = country.idd?.root
    ? `${country.idd.root}${country.idd.suffixes?.[0] ?? ''}`
    : null

  return {
    country_code:  country.cca2,
    name:          country.name.common,
    flag_emoji:    country.flag,
    flag_url:      country.flags?.png ?? null,
    currency_code: currencyCode,
    currency_name: currencies[0]?.name ?? null,
    calling_code:  callingCode,
    region:        country.region,
    subregion:     country.subregion ?? null,
    language:      languages[0] ?? null,
  }
}

const MOCK_US: RestCountry = {
  cca2: 'US',
  name: { common: 'United States' },
  flag: '🇺🇸',
  flags: { png: 'https://flagcdn.com/w320/us.png', svg: 'https://flagcdn.com/us.svg' },
  currencies: { USD: { name: 'United States dollar', symbol: '$' } },
  idd: { root: '+1', suffixes: [''] },
  region: 'Americas',
  subregion: 'North America',
  languages: { eng: 'English' },
}

const MOCK_PK: RestCountry = {
  cca2: 'PK',
  name: { common: 'Pakistan' },
  flag: '🇵🇰',
  flags: { png: 'https://flagcdn.com/w320/pk.png', svg: 'https://flagcdn.com/pk.svg' },
  currencies: { PKR: { name: 'Pakistani rupee', symbol: '₨' } },
  idd: { root: '+9', suffixes: ['2'] },
  region: 'Asia',
  subregion: 'South Asia',
  languages: { eng: 'English', urd: 'Urdu' },
}

// ─────────────────────────────────────────────────────────────────────────────
describe('Country API — Response Parsing', () => {
  it('correctly parses United States country data', () => {
    const result = parseCountryResponse(MOCK_US)
    expect(result.country_code).toBe('US')
    expect(result.name).toBe('United States')
    expect(result.flag_emoji).toBe('🇺🇸')
    expect(result.currency_code).toBe('USD')
    expect(result.currency_name).toBe('United States dollar')
    expect(result.calling_code).toBe('+1')
    expect(result.region).toBe('Americas')
    expect(result.language).toBe('English')
  })

  it('correctly parses Pakistan country data', () => {
    const result = parseCountryResponse(MOCK_PK)
    expect(result.country_code).toBe('PK')
    expect(result.name).toBe('Pakistan')
    expect(result.currency_code).toBe('PKR')
    expect(result.calling_code).toBe('+92')
    expect(result.subregion).toBe('South Asia')
  })

  it('returns first language when country has multiple languages (PK has eng + urd)', () => {
    const result = parseCountryResponse(MOCK_PK)
    // Object.values() order matches insertion — eng was first
    expect(result.language).toBe('English')
  })

  it('returns null calling_code when idd is missing', () => {
    const country = { ...MOCK_US, idd: undefined }
    const result  = parseCountryResponse(country)
    expect(result.calling_code).toBeNull()
  })

  it('returns null currency when no currencies provided', () => {
    const country = { ...MOCK_US, currencies: undefined }
    const result  = parseCountryResponse(country)
    expect(result.currency_code).toBeNull()
    expect(result.currency_name).toBeNull()
  })

  it('returns null language when no languages provided', () => {
    const country = { ...MOCK_US, languages: undefined }
    const result  = parseCountryResponse(country)
    expect(result.language).toBeNull()
  })

  it('returns null subregion when country has no subregion', () => {
    const country = { ...MOCK_US, subregion: undefined }
    const result  = parseCountryResponse(country)
    expect(result.subregion).toBeNull()
  })

  it('includes flag_url from flags.png', () => {
    const result = parseCountryResponse(MOCK_US)
    expect(result.flag_url).toBe('https://flagcdn.com/w320/us.png')
  })

  it('country_code is always uppercase (matches DB cache key)', () => {
    const result = parseCountryResponse(MOCK_PK)
    expect(result.country_code).toBe(result.country_code.toUpperCase())
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('getFlagImageUrl', () => {
  it('generates correct CDN URL for US', () => {
    expect(getFlagImageUrl('US')).toBe('https://flagcdn.com/24x18/us.png')
  })

  it('generates correct CDN URL for PK', () => {
    expect(getFlagImageUrl('PK')).toBe('https://flagcdn.com/24x18/pk.png')
  })

  it('lowercases the country code in the URL', () => {
    expect(getFlagImageUrl('GB')).toBe('https://flagcdn.com/24x18/gb.png')
  })

  it('works with already-lowercase input', () => {
    expect(getFlagImageUrl('de')).toBe('https://flagcdn.com/24x18/de.png')
  })

  it('produces 24x18 size images (for Windows emoji fix)', () => {
    const url = getFlagImageUrl('AU')
    expect(url).toContain('24x18')
    expect(url).toContain('.png')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('COMMON_COUNTRIES', () => {
  it('contains at least 10 countries', () => {
    expect(COMMON_COUNTRIES.length).toBeGreaterThanOrEqual(10)
  })

  it('contains US, PK, GB entries', () => {
    const codes = COMMON_COUNTRIES.map(c => c.code)
    expect(codes).toContain('US')
    expect(codes).toContain('PK')
    expect(codes).toContain('GB')
  })

  it('every entry has code, name, and flag fields', () => {
    for (const country of COMMON_COUNTRIES) {
      expect(country.code).toBeTruthy()
      expect(country.name).toBeTruthy()
      expect(country.flag).toBeTruthy()
    }
  })

  it('all country codes are exactly 2 uppercase letters', () => {
    for (const country of COMMON_COUNTRIES) {
      expect(country.code).toMatch(/^[A-Z]{2}$/)
    }
  })

  it('contains Pakistan entry with correct name', () => {
    const pk = COMMON_COUNTRIES.find(c => c.code === 'PK')
    expect(pk).toBeDefined()
    expect(pk?.name).toBe('Pakistan')
    expect(pk?.flag).toBe('🇵🇰')
  })

  it('has no duplicate country codes', () => {
    const codes = COMMON_COUNTRIES.map(c => c.code)
    const unique = new Set(codes)
    expect(unique.size).toBe(codes.length)
  })
})
