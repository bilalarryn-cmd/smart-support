'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Bell, Search, MessageSquare, CheckCircle, Clock, AlertTriangle, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials, formatRelativeTime } from '@/lib/utils'
import type { UserProfile } from '@/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface TopbarProps {
  profile: UserProfile | null
  title?: string
}

interface NotifItem {
  id: string
  icon: React.ElementType
  iconColor: string
  title: string
  subtitle: string
  time: string
  href: string
}

export function Topbar({ profile, title }: TopbarProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<NotifItem[]>([])
  const [loading, setLoading] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const role = profile?.role ?? 'customer'

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const loadNotifs = async () => {
    if (loading) return
    setLoading(true)
    try {
      if (role === 'customer') {
        const res = await fetch('/api/customer/notifications')
        if (!res.ok) { setLoading(false); return }
        const data = await res.json()
        const tickets = data.tickets ?? []
        const messages = data.messages ?? []
        const items: NotifItem[] = [
          ...messages.slice(0, 3).map((m: { id: string; content: string; created_at: string; ticket_id: string; sender?: { role: string } }) => {
            const t = tickets.find((x: { id: string; ticket_number: number }) => x.id === m.ticket_id)
            return {
              id: 'msg-' + m.id,
              icon: MessageSquare,
              iconColor: 'text-blue-600 bg-blue-50',
              title: `${m.sender?.role === 'admin' ? 'Admin' : 'Agent'} replied`,
              subtitle: t ? `#${t.ticket_number}: ${m.content.slice(0, 60)}` : m.content.slice(0, 60),
              time: m.created_at,
              href: t ? `/tickets/${t.id}` : '/tickets',
            }
          }),
          ...tickets.filter((t: { status: string }) => t.status === 'resolved' || t.status === 'closed').slice(0, 2).map((t: { id: string; ticket_number: number; subject: string; status: string; updated_at: string }) => ({
            id: 'status-' + t.id,
            icon: CheckCircle,
            iconColor: 'text-emerald-600 bg-emerald-50',
            title: t.status === 'closed' ? 'Ticket closed' : 'Ticket resolved',
            subtitle: `#${t.ticket_number}: ${t.subject}`,
            time: t.updated_at,
            href: `/tickets/${t.id}`,
          })),
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5)
        setNotifs(items)
      } else if (role === 'agent') {
        const res = await fetch('/api/agent/queue')
        if (!res.ok) { setLoading(false); return }
        const data = await res.json()
        const tickets = (data.tickets ?? []).slice(0, 5)
        setNotifs(tickets.map((t: { id: string; ticket_number: number; subject: string; priority: string; created_at: string }) => ({
          id: t.id,
          icon: t.priority === 'high' || t.priority === 'critical' ? AlertTriangle : Clock,
          iconColor: t.priority === 'high' || t.priority === 'critical' ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50',
          title: `New ticket in queue`,
          subtitle: `#${t.ticket_number}: ${t.subject}`,
          time: t.created_at,
          href: `/agent/tickets/${t.id}`,
        })))
      } else {
        // admin — recent audit logs
        const res = await fetch('/api/admin/tickets?limit=5')
        if (!res.ok) { setLoading(false); return }
        const data = await res.json()
        setNotifs((data.tickets ?? []).slice(0, 5).map((t: { id: string; ticket_number: number; subject: string; status: string; created_at: string }) => ({
          id: t.id,
          icon: t.status === 'new' ? Bell : CheckCircle,
          iconColor: t.status === 'new' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 bg-slate-50',
          title: t.status === 'new' ? 'New ticket submitted' : `Ticket ${t.status}`,
          subtitle: `#${t.ticket_number}: ${t.subject}`,
          time: t.created_at,
          href: `/agent/tickets/${t.id}`,
        })))
      }
    } catch { /* silent */ }
    setLoading(false)
  }

  const handleBellClick = () => {
    const next = !open
    setOpen(next)
    if (next && notifs.length === 0) loadNotifs()
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    const base = role === 'admin' ? '/admin' : role === 'agent' ? '/agent' : ''
    router.push(`${base}/tickets?q=${encodeURIComponent(query.trim())}`)
  }

  const viewAllHref = role === 'customer' ? '/notifications' : role === 'agent' ? '/agent/queue' : '/admin/audit-logs'

  return (
    <header className="h-16 glass-topbar flex items-center gap-4 px-6 sticky top-0 z-20">
      {/* Left */}
      <div className="w-40 shrink-0 hidden sm:block">
        {title && <h2 className="text-base font-bold text-[#222222] truncate">{title}</h2>}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#666666] pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tickets, users…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-[#EEF2F7] border border-[#E5E7EB] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#1E63FF]/20 focus:border-[#1E63FF] transition-all placeholder:text-[#999999] text-[#222222]"
          />
        </div>
      </form>

      {/* Right */}
      <div className="flex items-center gap-3 shrink-0">

        {/* Bell with dropdown */}
        <div ref={dropRef} className="relative">
          <button
            onClick={handleBellClick}
            className="relative p-2 rounded-[10px] hover:bg-[#f0f4ff] text-[#666666] hover:text-[#1E63FF] transition-colors"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-full" />
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800">Notifications</p>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto">
                {loading ? (
                  <div className="space-y-2 p-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : notifs.length === 0 ? (
                  <div className="py-10 text-center">
                    <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {notifs.map(n => {
                      const Icon = n.icon
                      return (
                        <Link
                          key={n.id}
                          href={n.href}
                          onClick={() => setOpen(false)}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                        >
                          <div className={`rounded-lg p-1.5 shrink-0 ${n.iconColor}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                            <p className="text-xs text-slate-500 truncate">{n.subtitle}</p>
                          </div>
                          <p className="text-xs text-slate-400 shrink-0">{formatRelativeTime(n.time)}</p>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>

              <Link
                href={viewAllHref}
                onClick={() => setOpen(false)}
                className="block text-center text-xs font-semibold text-blue-600 hover:text-blue-700 py-3 border-t border-slate-100 hover:bg-blue-50 transition-colors"
              >
                View all →
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 pl-3 border-l border-[#E5E7EB]">
          <Avatar className="h-8 w-8 ring-2 ring-[#E5E7EB]">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="text-white text-xs font-semibold"
              style={{ background: 'linear-gradient(90deg, #1E63FF, #6A5BFF)' }}>
              {getInitials(profile?.full_name ?? 'U')}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-[#222222] leading-tight">{profile?.full_name ?? 'User'}</p>
            <p className="text-xs text-[#666666] capitalize">{profile?.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
