'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { CheckSquare, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TicketStatusBadge, TicketPriorityBadge } from '@/components/shared/ticket-status-badge'
import { SlaIndicator } from '@/components/shared/sla-indicator'
import { EmptyState } from '@/components/shared/empty-state'
import { PageLoader } from '@/components/shared/loading-spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatRelativeTime } from '@/lib/utils'
import type { Ticket, UserProfile, SlaRule } from '@/types'

export default function AgentAssignedPage() {
  const [tickets, setTickets] = useState<(Ticket & { customer?: UserProfile })[]>([])
  const [slaRules, setSlaRules] = useState<SlaRule[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let q = supabase
      .from('tickets')
      .select('*, customer:user_profiles!customer_id(*), category:ticket_categories(name, color)')
      .eq('assigned_agent_id', user.id)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (statusFilter === 'active') q = q.not('status', 'in', '(resolved,closed)')
    else if (statusFilter !== 'all') q = q.eq('status', statusFilter)

    if (search) q = q.ilike('subject', `%${search}%`)

    const [ticketsRes, slaRes] = await Promise.all([
      q,
      supabase.from('sla_rules').select('*').eq('is_active', true),
    ])

    setTickets((ticketsRes.data ?? []) as (Ticket & { customer?: UserProfile })[])
    setSlaRules((slaRes.data ?? []) as SlaRule[])
    setLoading(false)
  }, [search, statusFilter])

  useEffect(() => { load() }, [load])

  const getSlaRule = (priority: string) => slaRules.find(r => r.priority === priority) ?? null

  return (
    <div className="animate-slide-in">
      <PageHeader title="My Assigned Tickets" subtitle={`${tickets.length} tickets assigned to you`} />

      <Card className="mb-6">
        <CardContent className="pt-5">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search tickets..."
                icon={<Search className="h-4 w-4" />}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="waiting_for_customer">Waiting</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? <PageLoader /> : tickets.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No assigned tickets" description="Pick up tickets from the queue to get started." />
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <Link
              key={ticket.id}
              href={`/agent/tickets/${ticket.id}`}
              className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all block group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-blue-500">#{ticket.ticket_number}</span>
                </div>
                <h3 className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">{ticket.subject}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{ticket.customer?.full_name}</p>
                <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(ticket.created_at)}</p>
                <div className="mt-3">
                  <SlaIndicator ticket={ticket} slaRule={getSlaRule(ticket.priority)} compact />
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end shrink-0">
                <TicketPriorityBadge priority={ticket.priority} />
                <TicketStatusBadge status={ticket.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
