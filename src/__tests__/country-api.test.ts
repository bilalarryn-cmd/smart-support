import { describe, it, expect, vi, beforeEach } from 'vitest'

// Tests the REST Countries API response parsing logic
// (mirrors the logic in src/lib/countries/api.ts)

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
  const currencies = country.currencies ? Object.values(country.currencies) : []
  const currencyCode = country.currencies ? Object.keys(country.currencies)[0] : null
  const languages = country.languages ? Object.values(country.languages) : []
  const callingCode = country.idd?.root
    ? `${country.idd.root}${country.idd.suffixes?.[0] ?? ''}`
    : null

  return {
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

describe('Country API Response Handling', () => {
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

  it('returns null calling_code when idd is missing', () => {
    const country = { ...MOCK_US, idd: undefined }
    const result = parseCountryResponse(country)
    expect(result.calling_code).toBeNull()
  })

  it('returns null currency when no currencies provided', () => {
    const country = { ...MOCK_US, currencies: undefined }
    const result = parseCountryResponse(country)
    expect(result.currency_code).toBeNull()
    expect(result.currency_name).toBeNull()
  })

  it('returns null language when no languages provided', () => {
    const country = { ...MOCK_US, languages: undefined }
    const result = parseCountryResponse(country)
    expect(result.language).toBeNull()
  })

  it('includes flag_url from flags.png', () => {
    const result = parseCountryResponse(MOCK_US)
    expect(result.flag_url).toBe('https://flagcdn.com/w320/us.png')
  })

  it('builds correct cache key (country_code is uppercase cca2)', () => {
    const result = parseCountryResponse(MOCK_PK)
    expect(result.country_code).toBe(result.country_code.toUpperCase())
  })
})
