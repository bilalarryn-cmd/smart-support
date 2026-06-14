'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { TicketStatusBadge, TicketPriorityBadge } from '@/components/shared/ticket-status-badge'
import { SlaIndicator } from '@/components/shared/sla-indicator'
import { PageLoader } from '@/components/shared/loading-spinner'
import { formatRelativeTime } from '@/lib/utils'
import { COMMON_COUNTRIES } from '@/lib/countries/api'
import type { Ticket, UserProfile, SlaRule, TicketCategory } from '@/types'

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<(Ticket & { customer?: UserProfile; assigned_agent?: UserProfile; category?: TicketCategory })[]>([])
  const [categories, setCategories] = useState<TicketCategory[]>([])
  const [agents, setAgents] = useState<UserProfile[]>([])
  const [slaRules, setSlaRules] = useState<SlaRule[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [agentFilter, setAgentFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const supabase = createClient()

  const load = useCallback(async () => {
    let q = supabase
      .from('tickets')
      .select('*, customer:user_profiles!customer_id(*), assigned_agent:user_profiles!assigned_agent_id(*), category:ticket_categories(*)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (statusFilter !== 'all') q = q.eq('status', statusFilter)
    if (priorityFilter !== 'all') q = q.eq('priority', priorityFilter)
    if (categoryFilter !== 'all') q = q.eq('category_id', categoryFilter)
    if (agentFilter === 'unassigned') q = q.is('assigned_agent_id', null)
    else if (agentFilter !== 'all') q = q.eq('assigned_agent_id', agentFilter)
    if (countryFilter !== 'all') q = q.eq('country_code', countryFilter)
    if (search) q = q.ilike('subject', `%${search}%`)
    if (dateFrom) q = q.gte('created_at', new Date(dateFrom).toISOString())
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      q = q.lte('created_at', end.toISOString())
    }

    const [ticketsRes, catsRes, agentsRes, slaRes] = await Promise.all([
      q,
      supabase.from('ticket_categories').select('*').eq('is_active', true),
      supabase.from('user_profiles').select('*').eq('role', 'agent'),
      supabase.from('sla_rules').select('*').eq('is_active', true),
    ])

    setTickets((ticketsRes.data ?? []) as (Ticket & { customer?: UserProfile; assigned_agent?: UserProfile; category?: TicketCategory })[])
    setCategories((catsRes.data ?? []) as TicketCategory[])
    setAgents((agentsRes.data ?? []) as UserProfile[])
    setSlaRules((slaRes.data ?? []) as SlaRule[])
    setLoading(false)
  }, [search, statusFilter, priorityFilter, categoryFilter, agentFilter, countryFilter, dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  const getSlaRule = (priority: string) => slaRules.find(r => r.priority === priority) ?? null

  const clearAll = () => {
    setSearch(''); setStatusFilter('all'); setPriorityFilter('all')
    setCategoryFilter('all'); setAgentFilter('all'); setCountryFilter('all')
    setDateFrom(''); setDateTo('')
  }

  const hasFilters = statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all'
    || agentFilter !== 'all' || countryFilter !== 'all' || search || dateFrom || dateTo

  return (
    <div className="animate-slide-in">
      <PageHeader title="All Tickets" subtitle={`${tickets.length} tickets`} />

      <Card className="mb-6">
        <CardContent className="pt-5 space-y-3">
          {/* Row 1: search + status + priority + category + agent */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-48">
              <Input placeholder="Search tickets..." icon={<Search className="h-4 w-4" />} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="waiting_for_customer">Waiting</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">🚨 Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Agent" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: country + date range + clear */}
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {COMMON_COUNTRIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 whitespace-nowrap">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-slate-700 bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 whitespace-nowrap">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-slate-700 bg-white"
              />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-slate-500 hover:text-slate-700">
                <X className="h-4 w-4" /> Clear all
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? <PageLoader /> : (
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No tickets found</div>
          ) : tickets.map(ticket => (
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
                    <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                      {COMMON_COUNTRIES.find(c => c.code === ticket.country_code)?.flag ?? ''} {ticket.country_code}
                    </span>
                  )}
                  {ticket.sla_breached && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">SLA Breached</span>}
                </div>
                <Link href={`/agent/tickets/${ticket.id}`}>
                  <h3 className="font-semibold text-slate-800 hover:text-blue-700 transition-colors">{ticket.subject}</h3>
                </Link>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-xs text-slate-500">Customer: {ticket.customer?.full_name}</p>
                  <p className="text-xs text-slate-500">Agent: {ticket.assigned_agent?.full_name ?? 'Unassigned'}</p>
                  <p className="text-xs text-slate-400">{formatRelativeTime(ticket.created_at)}</p>
                </div>
                <div className="mt-2">
                  <SlaIndicator ticket={ticket} slaRule={getSlaRule(ticket.priority)} compact />
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end shrink-0">
                <TicketPriorityBadge priority={ticket.priority} />
                <TicketStatusBadge status={ticket.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
