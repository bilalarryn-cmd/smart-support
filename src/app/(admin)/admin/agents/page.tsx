'use client'

import React, { useState, useEffect } from 'react'
import { Shield, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PageLoader } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { formatDate, getInitials } from '@/lib/utils'
import type { UserProfile } from '@/types'

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<(UserProfile & { ticket_count?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      let q = supabase.from('user_profiles').select('*').eq('role', 'agent').order('full_name')
      if (search) q = q.ilike('full_name', `%${search}%`)
      const { data: agentData } = await q

      const agentsWithCounts = await Promise.all(
        ((agentData ?? []) as UserProfile[]).map(async agent => {
          const { count } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_agent_id', agent.id)
            .not('status', 'in', '(resolved,closed)')
          return { ...agent, ticket_count: count ?? 0 }
        })
      )

      setAgents(agentsWithCounts)
      setLoading(false)
    }
    load()
  }, [search])

  return (
    <div className="animate-slide-in">
      <PageHeader title="Agent Management" subtitle={`${agents.length} agents`} />

      <Card className="mb-6">
        <CardContent className="pt-5">
          <Input placeholder="Search agents..." icon={<Search className="h-4 w-4" />} value={search} onChange={e => setSearch(e.target.value)} />
        </CardContent>
      </Card>

      {loading ? <PageLoader /> : agents.length === 0 ? (
        <EmptyState icon={Shield} title="No agents found" description="Promote users to agent role from the Users page." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
            <div key={agent.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="text-lg">{getInitials(agent.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-slate-900">{agent.full_name}</p>
                  <p className="text-xs text-slate-500">Agent since {formatDate(agent.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Active Tickets</span>
                <span className={`font-semibold ${(agent.ticket_count ?? 0) > 10 ? 'text-red-600' : (agent.ticket_count ?? 0) > 5 ? 'text-amber-600' : 'text-slate-800'}`}>
                  {agent.ticket_count}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${agent.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {agent.is_active ? 'Active' : 'Inactive'}
                </span>
                {agent.country_code && <span className="text-xs text-slate-400">{agent.country_code}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
