'use client'

import React, { useState } from 'react'
import { Bell, Search } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import type { UserProfile } from '@/types'
import { useRouter } from 'next/navigation'

interface TopbarProps {
  profile: UserProfile | null
  title?: string
}

export function Topbar({ profile, title }: TopbarProps) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    const role = profile?.role ?? 'customer'
    const base = role === 'admin' ? '/admin' : role === 'agent' ? '/agent' : ''
    router.push(`${base}/tickets?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <header className="h-16 glass-topbar flex items-center gap-4 px-6 sticky top-0 z-20">
      {/* Left - title */}
      <div className="w-40 shrink-0 hidden sm:block">
        {title && <h2 className="text-base font-semibold text-slate-800 truncate">{title}</h2>}
      </div>

      {/* Center - search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tickets, users…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-white/60 backdrop-blur-sm border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-400 shadow-sm"
          />
        </div>
      </form>

      {/* Right */}
      <div className="flex items-center gap-3 shrink-0">
        <button className="relative p-2 rounded-xl hover:bg-white/60 text-slate-400 hover:text-slate-700 transition-all">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full shadow-sm" />
        </button>

        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200/60">
          <Avatar className="h-8 w-8 ring-2 ring-white shadow-sm">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-xs font-semibold">
              {getInitials(profile?.full_name ?? 'U')}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-800 leading-tight">{profile?.full_name ?? 'User'}</p>
            <p className="text-xs text-slate-400 capitalize">{profile?.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
