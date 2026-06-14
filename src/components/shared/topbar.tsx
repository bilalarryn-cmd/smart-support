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
        <button className="relative p-2 rounded-[10px] hover:bg-[#f0f4ff] text-[#666666] hover:text-[#1E63FF] transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-full" />
        </button>

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
