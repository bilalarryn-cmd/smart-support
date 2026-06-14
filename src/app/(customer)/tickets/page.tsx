'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, Filter, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { TicketStatusBadge, TicketPriorityBadge } from '@/components/shared/ticket-status-badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageLoader } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { formatRelativeTime, truncate } from '@/lib/utils'
import type { Ticket, TicketCategory } from '@/types'

export default function CustomerTicketsPage() {
  const [tickets, setTickets] = useState<(Ticket & { category?: TicketCategory })[]>([])
  const [categories, setCategories] = useState<TicketCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const fetchTickets = useCallback(async () => {
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (priorityFilter !== 'all') params.set('priority', priorityFilter)
    params.set('limit', '100')

    const res = await fetch(`/api/tickets?${params.toString()}`)
    if (!res.ok) { setLoading(false); return }

    const json = await res.json()
    let data = (json.data ?? []) as (Ticket & { category?: TicketCategory })[]

    if (categoryFilter !== 'all') data = data.filter(t => t.category_id === categoryFilter)
    if (search) data = data.filter(t => t.subject.toLowerCase().includes(search.toLowerCase()))

    setTickets(data)
    setLoading(false)
  }, [statusFilter, priorityFilter, categoryFilter, search])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setCategories(data as TicketCategory[])
    })
  }, [])

  const hasFilters = statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' || search

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="My Tickets"
        subtitle={`${tickets.length} total tickets`}
        actions={
          <Link href="/tickets/new">
            <Button size="md">
              <Plus className="h-4 w-4" />
              New Ticket
            </Button>
          </Link>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search tickets..."
                icon={<Search className="h-4 w-4" />}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
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
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            {categories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(''); setStatusFilter('all'); setPriorityFilter('all'); setCategoryFilter('all') }}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ticket list */}
      {loading ? (
        <PageLoader />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={Plus}
          title={hasFilters ? 'No tickets match your filters' : 'No tickets yet'}
          description={hasFilters ? 'Try adjusting your search or filters.' : 'Create your first support ticket to get started.'}
          action={!hasFilters ? <Link href="/tickets/new"><Button><Plus className="h-4 w-4" />Create Ticket</Button></Link> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <Link
              key={ticket.id}
              href={`/tickets/${ticket.id}`}
              className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all duration-150 group block"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  <span className="text-xs font-semibold text-blue-500">#{ticket.ticket_number}</span>
                  {ticket.category && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: ticket.category.color + '20', color: ticket.category.color }}
                    >
                      {ticket.category.name}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                  {ticket.subject}
                </h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                  {truncate(ticket.description, 100)}
                </p>
                <p className="text-xs text-slate-400 mt-2">{formatRelativeTime(ticket.created_at)}</p>
              </div>
              <div className="flex flex-col gap-2 items-end shrink-0">
                <TicketStatusBadge status={ticket.status} />
                <TicketPriorityBadge priority={ticket.priority} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
