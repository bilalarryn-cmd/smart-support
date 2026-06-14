import { createAdminClient } from '@/lib/supabase/admin'
import { Globe } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/stat-card'
import { formatDateTime } from '@/lib/utils'
import type { CountryInfo } from '@/types'

export default async function AdminCountriesPage() {
  const db = createAdminClient()

  const [countriesRes, ticketCountryRes] = await Promise.all([
    db.from('country_info_cache').select('*').order('name'),
    db.from('tickets').select('country_code').not('country_code', 'is', null),
  ])

  const countries = (countriesRes.data ?? []) as CountryInfo[]
  const ticketCountries = ticketCountryRes.data ?? []

  const countryTicketCounts: Record<string, number> = {}
  ticketCountries.forEach((t: { country_code: string }) => {
    countryTicketCounts[t.country_code] = (countryTicketCounts[t.country_code] ?? 0) + 1
  })

  const sortedByTickets = [...countries].sort((a, b) =>
    (countryTicketCounts[b.country_code] ?? 0) - (countryTicketCounts[a.country_code] ?? 0)
  )

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Country Data"
        subtitle="CountryInfoCache — geographic data for support tickets"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Countries Cached" value={countries.length} icon={Globe} color="blue" />
        <StatCard title="Tickets with Country" value={ticketCountries.length} icon={Globe} color="green" />
        <StatCard title="Unique Countries" value={Object.keys(countryTicketCounts).length} icon={Globe} color="purple" />
      </div>

      {/* Top countries by ticket volume */}
      {sortedByTickets.some(c => countryTicketCounts[c.country_code]) && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Tickets by Country</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sortedByTickets.filter(c => countryTicketCounts[c.country_code]).map(country => (
                <div key={country.country_code} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                  <span className="text-2xl">{country.flag_emoji ?? '🌐'}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 text-sm">{country.name}</p>
                    <p className="text-xs text-slate-400">{country.region} · {country.currency_code}</p>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{countryTicketCounts[country.country_code]} tickets</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full cache table */}
      <Card>
        <CardHeader><CardTitle>All Cached Countries ({countries.length})</CardTitle></CardHeader>
        <CardContent>
          {countries.length === 0 ? (
            <p className="text-center text-slate-400 py-12">No country data cached yet. Data is cached automatically when tickets are created from different countries.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Flag</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Country</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Code</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Region</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Currency</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Language</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Tickets</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase">Cached At</th>
                  </tr>
                </thead>
                <tbody>
                  {countries.map(country => (
                    <tr key={country.country_code} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-3 text-xl">{country.flag_emoji ?? '🌐'}</td>
                      <td className="py-3 px-3 font-medium text-slate-800">{country.name}</td>
                      <td className="py-3 px-3 text-xs text-slate-500 font-mono">{country.country_code}</td>
                      <td className="py-3 px-3 text-xs text-slate-500">{country.region}</td>
                      <td className="py-3 px-3 text-xs text-slate-500">{country.currency_code} {country.currency_name ? `(${country.currency_name})` : ''}</td>
                      <td className="py-3 px-3 text-xs text-slate-500">{country.language}</td>
                      <td className="py-3 px-3 text-sm font-semibold text-blue-600">{countryTicketCounts[country.country_code] ?? 0}</td>
                      <td className="py-3 px-3 text-xs text-slate-400">{formatDateTime(country.cached_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
