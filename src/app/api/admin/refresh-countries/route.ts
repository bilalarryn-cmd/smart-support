import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseAdminToken } from '@/lib/admin-auth'

const COMMON_FLAGS: Record<string, string> = {
  US: '🇺🇸', GB: '🇬🇧', CA: '🇨🇦', AU: '🇦🇺', DE: '🇩🇪',
  FR: '🇫🇷', IN: '🇮🇳', PK: '🇵🇰', JP: '🇯🇵', BR: '🇧🇷',
  MX: '🇲🇽', NG: '🇳🇬', ZA: '🇿🇦', SG: '🇸🇬', AE: '🇦🇪',
  SA: '🇸🇦', EG: '🇪🇬', TR: '🇹🇷', ID: '🇮🇩', PH: '🇵🇭',
  BD: '🇧🇩', VN: '🇻🇳', TH: '🇹🇭', MY: '🇲🇾', KR: '🇰🇷',
  CN: '🇨🇳', RU: '🇷🇺', IT: '🇮🇹', ES: '🇪🇸', NL: '🇳🇱',
  SE: '🇸🇪', NO: '🇳🇴', CH: '🇨🇭', AT: '🇦🇹', PL: '🇵🇱',
  AR: '🇦🇷', CL: '🇨🇱', CO: '🇨🇴', NZ: '🇳🇿', ZW: '🇿🇼',
}

function countryCodeToFlag(code: string): string {
  // Convert ISO 3166-1 alpha-2 to emoji flag
  if (COMMON_FLAGS[code]) return COMMON_FLAGS[code]
  // Regional indicator letters: A=🇦 is 0x1F1E6, so A=65, offset=0x1F1E6-65
  const offset = 0x1F1E6 - 65
  const chars = code.toUpperCase().split('')
  if (chars.length !== 2) return '🌐'
  const a = chars[0].charCodeAt(0)
  const b = chars[1].charCodeAt(0)
  if (a < 65 || a > 90 || b < 65 || b > 90) return '🌐'
  return String.fromCodePoint(a + offset) + String.fromCodePoint(b + offset)
}

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = parseAdminToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: countries } = await db.from('country_info_cache').select('country_code, flag_emoji')

  if (!countries || countries.length === 0) return NextResponse.json({ updated: 0 })

  // Update all countries that have null or empty flag_emoji
  const toUpdate = countries.filter((c: { country_code: string; flag_emoji: string | null }) => !c.flag_emoji)

  let updated = 0
  for (const country of toUpdate) {
    const flag = countryCodeToFlag(country.country_code)
    await db.from('country_info_cache')
      .update({ flag_emoji: flag })
      .eq('country_code', country.country_code)
    updated++
  }

  // Also update existing ones where flag is '🌐' fallback
  const withBadFlag = countries.filter((c: { country_code: string; flag_emoji: string | null }) => c.flag_emoji === '🌐')
  for (const country of withBadFlag) {
    const flag = countryCodeToFlag(country.country_code)
    if (flag !== '🌐') {
      await db.from('country_info_cache')
        .update({ flag_emoji: flag })
        .eq('country_code', country.country_code)
      updated++
    }
  }

  return NextResponse.json({ updated, total: countries.length })
}
