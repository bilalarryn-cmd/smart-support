'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Ticket, Plus, User, Bell, LogOut, Menu, X,
  Users, Settings, BarChart3, Mail, Cpu, ClipboardList, Tag,
  Clock, Inbox, CheckSquare, Shield, ChevronRight, MessageSquare
} from 'lucide-react'
import type { UserProfile } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: number
}

interface NavSection {
  title?: string
  items: NavItem[]
}

function getNavSections(role: string): NavSection[] {
  if (role === 'admin') {
    return [
      {
        title: 'Overview',
        items: [
          { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
          { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
        ],
      },
      {
        title: 'Management',
        items: [
          { label: 'All Tickets', href: '/admin/tickets', icon: Ticket },
          { label: 'Users', href: '/admin/users', icon: Users },
          { label: 'Agents', href: '/admin/agents', icon: Shield },
          { label: 'Categories', href: '/admin/categories', icon: Tag },
          { label: 'SLA Rules', href: '/admin/sla', icon: Clock },
          { label: 'Canned Responses', href: '/admin/canned-responses', icon: MessageSquare },
        ],
      },
      {
        title: 'Logs',
        items: [
          { label: 'Email Logs', href: '/admin/email-logs', icon: Mail },
          { label: 'Automation Logs', href: '/admin/automation-logs', icon: Cpu },
          { label: 'Audit Logs', href: '/admin/audit-logs', icon: ClipboardList },
        ],
      },
      {
        title: 'System',
        items: [
          { label: 'Settings', href: '/admin/settings', icon: Settings },
        ],
      },
    ]
  }

  if (role === 'agent') {
    return [
      {
        items: [
          { label: 'Dashboard', href: '/agent/dashboard', icon: LayoutDashboard },
          { label: 'Queue', href: '/agent/queue', icon: Inbox },
          { label: 'My Tickets', href: '/agent/assigned', icon: CheckSquare },
        ],
      },
    ]
  }

  return [
    {
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'My Tickets', href: '/tickets', icon: Ticket },
        { label: 'New Ticket', href: '/tickets/new', icon: Plus },
        { label: 'Profile', href: '/profile', icon: User },
        { label: 'Notifications', href: '/notifications', icon: Bell },
      ],
    },
  ]
}

interface SidebarProps {
  profile: UserProfile | null
}

export function Sidebar({ profile }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const role = profile?.role ?? 'customer'
  const sections = getNavSections(role)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg glow-blue">
            <Ticket className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight text-gradient">Smart Support</p>
            <p className="text-slate-400 text-xs">Automation Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map((section, i) => (
          <div key={i}>
            {section.title && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400/80 mb-2">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-blue-50/90 to-indigo-50/90 text-blue-700 shadow-sm border border-blue-100/60'
                        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 hover:translate-x-0.5'
                    )}
                  >
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all',
                      isActive
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-500 shadow-sm'
                        : 'bg-slate-100/80'
                    )}>
                      <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-white' : 'text-slate-500')} />
                    </div>
                    <span>{item.label}</span>
                    {item.badge ? (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                        {item.badge}
                      </span>
                    ) : isActive ? (
                      <ChevronRight className="ml-auto h-3 w-3 text-blue-400" />
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/40">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/50 transition-all">
          <Avatar className="h-8 w-8 ring-2 ring-blue-100">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-xs font-semibold">
              {getInitials(profile?.full_name ?? 'U')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{profile?.full_name ?? 'User'}</p>
            <p className="text-xs text-slate-400 capitalize">{role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-red-50/80 text-slate-400 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-sm"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={cn(
        'lg:hidden fixed left-0 top-0 bottom-0 z-50 w-64 bg-white border-r border-slate-200 shadow-xl transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <X className="h-4 w-4" />
        </button>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 glass-sidebar z-30">
        <SidebarContent />
      </div>
    </>
  )
}
