'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { TicketCheck, Clock, AlertCircle, CheckCircle, Plus, ArrowRight, Inbox } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TicketStatusBadge, TicketPriorityBadge } from '@/components/shared/ticket-status-badge'
import { formatRelativeTime } from '@/lib/utils'
import type { Ticket } from '@/types'

export default function CustomerDashboardPage() {
  const [tickets, setTickets] = useState<(Ticket & { category?: { name: string; color: string } })[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTickets = useCallback(async () => {
    const res = await fetch('/api/tickets?limit=100')
    if (!res.ok) { setLoading(false); return }
    const json = await res.json()
    setTickets(json.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchTickets()
    // Poll every 30 seconds so admin changes show up automatically
    const interval = setInterval(fetchTickets, 30000)
    return () => clearInterval(interval)
  }, [fetchTickets])

  const all = tickets
  const newTickets = all.filter(t => t.status === 'new')
  const open = all.filter(t => t.status === 'open')
  const waiting = all.filter(t => t.status === 'waiting_for_customer')
  const resolved = all.filter(t => t.status === 'resolved')
  const closed = all.filter(t => t.status === 'closed')
  const recent = all.slice(0, 5)

  if (loading) {
    return (
      <div className="animate-slide-in">
        <PageHeader title="My Dashboard" subtitle="Track and manage your support tickets" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="My Dashboard"
        subtitle="Track and manage your support tickets"
        actions={
          <Link href="/tickets/new">
            <Button size="md">
              <Plus className="h-4 w-4" />
              New Ticket
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-8">
        <StatCard title="Total" value={all.length} icon={TicketCheck} color="blue" />
        <StatCard title="New" value={newTickets.length} icon={Inbox} color="amber" />
        <StatCard title="Open" value={open.length} icon={Clock} color="green" />
        <StatCard title="Waiting" value={waiting.length} icon={AlertCircle} color="red" />
        <StatCard title="Resolved" value={resolved.length} icon={CheckCircle} color="green" />
        <StatCard title="Closed" value={closed.length} icon={CheckCircle} color="slate" />
      </div>

      {/* Recent Tickets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Tickets</CardTitle>
            <Link href="/tickets">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 mb-3">
                <TicketCheck className="h-6 w-6 text-blue-400" />
              </div>
              <p className="text-slate-500 text-sm mb-4">No tickets yet</p>
              <Link href="/tickets/new">
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  Create your first ticket
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all duration-150 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-slate-400">#{ticket.ticket_number}</span>
                      {ticket.category && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: ticket.category.color + '20', color: ticket.category.color }}
                        >
                          {ticket.category.name}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-slate-800 text-sm truncate group-hover:text-blue-700">
                      {ticket.subject}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(ticket.created_at)}</p>
                  </div>
                  <div className="flex flex-col gap-1.5 items-end shrink-0">
                    <TicketStatusBadge status={ticket.status} />
                    <TicketPriorityBadge priority={ticket.priority} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
