'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Inbox, UserPlus, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TicketStatusBadge, TicketPriorityBadge } from '@/components/shared/ticket-status-badge'
import { SlaIndicator } from '@/components/shared/sla-indicator'
import { EmptyState } from '@/components/shared/empty-state'
import { PageLoader } from '@/components/shared/loading-spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatRelativeTime } from '@/lib/utils'
import { COMMON_COUNTRIES, getFlagImageUrl } from '@/lib/countries/api'
import type { Ticket, UserProfile, SlaRule } from '@/types'

export default function AgentQueuePage() {
  const [tickets, setTickets] = useState<(Ticket & { customer?: UserProfile; category?: { name: string; color: string } })[]>([])
  const [slaRules, setSlaRules] = useState<SlaRule[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
    setCurrentUser(profile as UserProfile)

    let q = supabase
      .from('tickets')
      .select('*, customer:user_profiles!customer_id(*), category:ticket_categories(name, color)')
      .is('assigned_agent_id', null)
      .not('status', 'in', '(resolved,closed)')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })

    if (priorityFilter !== 'all') q = q.eq('priority', priorityFilter)
    if (countryFilter !== 'all') q = q.eq('country_code', countryFilter)
    if (search) q = q.ilike('subject', `%${search}%`)
    if (dateFrom) q = q.gte('created_at', new Date(dateFrom).toISOString())
    if (dateTo) {
      const end = new Date(dateTo); end.setHours(23, 59, 59, 999)
      q = q.lte('created_at', end.toISOString())
    }

    const [ticketsRes, slaRes] = await Promise.all([
      q,
      supabase.from('sla_rules').select('*').eq('is_active', true),
    ])
    setTickets((ticketsRes.data ?? []) as (Ticket & { customer?: UserProfile; category?: { name: string; color: string } })[])
    setSlaRules((slaRes.data ?? []) as SlaRule[])
    setLoading(false)
  }, [priorityFilter, countryFilter, dateFrom, dateTo, search])

  useEffect(() => { load() }, [load])

  const assignToSelf = async (ticketId: string) => {
    if (!currentUser) return
    const { error } = await supabase.from('tickets').update({ assigned_agent_id: currentUser.id, status: 'open' }).eq('id', ticketId)
    if (error) { toast.error('Failed to assign ticket'); return }
    await supabase.from('ticket_assignments').insert({ ticket_id: ticketId, assigned_to: currentUser.id, assigned_by: currentUser.id })
    setTickets(prev => prev.filter(t => t.id !== ticketId))
    toast.success('Ticket assigned to you!')
  }

  const hasFilters = priorityFilter !== 'all' || countryFilter !== 'all' || search || dateFrom || dateTo
  const clearAll = () => { setPriorityFilter('all'); setCountryFilter('all'); setSearch(''); setDateFrom(''); setDateTo('') }

  return (
    <div className="animate-slide-in">
      <PageHeader title="Ticket Queue" subtitle={`${tickets.length} unassigned tickets`} />

      <Card className="mb-6">
        <CardContent className="pt-5 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-48">
              <Input placeholder="Search queue..." icon={<Search className="h-4 w-4" />} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">🚨 Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {COMMON_COUNTRIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="flex items-center gap-2">
                      <img src={getFlagImageUrl(c.code)} alt={c.name} width={20} height={15} className="rounded-sm shrink-0" />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-slate-700" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white text-slate-700" />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-slate-500 hover:text-slate-700">
                <X className="h-4 w-4" /> Clear all
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? <PageLoader /> : tickets.length === 0 ? (
        <EmptyState icon={Inbox} title="Queue is empty" description="All tickets have been assigned." />
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <div key={ticket.id} className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-blue-500">#{ticket.ticket_number}</span>
                  {ticket.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: ticket.category.color + '20', color: ticket.category.color }}>
                      {ticket.category.name}
                    </span>
                  )}
                  {ticket.country_code && (
                    <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                      <img src={getFlagImageUrl(ticket.country_code)} alt={ticket.country_code} width={16} height={12} className="rounded-sm" /> {ticket.country_code}
                    </span>
                  )}
                </div>
                <Link href={`/agent/tickets/${ticket.id}`}>
                  <h3 className="font-semibold text-slate-800 hover:text-blue-700 transition-colors">{ticket.subject}</h3>
                </Link>
                <p className="text-sm text-slate-500 mt-1">{ticket.customer?.full_name}</p>
                <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(ticket.created_at)}</p>
                <div className="mt-2">
                  <SlaIndicator ticket={ticket} slaRule={slaRules.find(r => r.priority === ticket.priority) ?? null} compact />
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <TicketPriorityBadge priority={ticket.priority} />
                <TicketStatusBadge status={ticket.status} />
                <Button size="sm" variant="outline" onClick={() => assignToSelf(ticket.id)}>
                  <UserPlus className="h-3.5 w-3.5" />
                  Assign to Me
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
