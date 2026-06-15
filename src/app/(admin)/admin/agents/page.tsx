'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Shield, Search, UserCheck, UserX, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { PageLoader } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { formatDate, getInitials } from '@/lib/utils'
import type { UserProfile } from '@/types'

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<(UserProfile & { ticket_count?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ full_name: '', email: '', password: '' })
  const [adding, setAdding] = useState(false)

  const load = async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/agents?${params}`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setAgents(data.agents)
    setLoading(false)
  }

  useEffect(() => { load() }, [search])

  const toggleActive = async (agentId: string, current: boolean) => {
    const res = await fetch('/api/admin/agents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, is_active: !current }),
    })
    if (!res.ok) { toast.error('Failed to update agent'); return }
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, is_active: !current } : a))
    toast.success(`Agent ${!current ? 'activated' : 'deactivated'}`)
  }

  const removeAgent = async (agentId: string, name: string) => {
    if (!confirm(`Remove "${name}" as agent? They will become a customer.`)) return
    const res = await fetch('/api/admin/agents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId }),
    })
    if (!res.ok) { toast.error('Failed to remove agent'); return }
    setAgents(prev => prev.filter(a => a.id !== agentId))
    toast.success(`${name} removed as agent`)
  }

  const addAgent = async () => {
    if (!addForm.full_name.trim() || !addForm.email.trim() || !addForm.password.trim()) {
      toast.error('All fields are required')
      return
    }
    if (addForm.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setAdding(true)
    const res = await fetch('/api/admin/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    })
    const data = await res.json()
    setAdding(false)
    if (!res.ok) { toast.error(data.error ?? 'Failed to create agent'); return }
    toast.success(`Agent "${addForm.full_name}" created!`)
    setAddForm({ full_name: '', email: '', password: '' })
    setAddOpen(false)
    load()
  }

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Agent Management"
        subtitle={`${agents.length} agents`}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Agent
          </Button>
        }
      />

      <Card className="mb-6">
        <CardContent className="pt-5">
          <Input placeholder="Search agents..." icon={<Search className="h-4 w-4" />} value={search} onChange={e => setSearch(e.target.value)} />
        </CardContent>
      </Card>

      {loading ? <PageLoader /> : agents.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No agents found"
          description="Add a new agent or promote a customer from Users page."
          action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add Agent</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => (
            <div key={agent.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="text-lg">{getInitials(agent.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{agent.full_name}</p>
                  <p className="text-xs text-slate-500">Agent since {formatDate(agent.created_at)}</p>
                </div>
                <button
                  onClick={() => removeAgent(agent.id, agent.full_name)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors shrink-0"
                  title="Remove agent"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-slate-500">Active Tickets</span>
                <span className={`font-semibold ${(agent.ticket_count ?? 0) > 10 ? 'text-red-600' : (agent.ticket_count ?? 0) > 5 ? 'text-amber-600' : 'text-slate-800'}`}>
                  {agent.ticket_count}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${agent.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {agent.is_active ? 'Active' : 'Inactive'}
                </span>
                <Button
                  size="sm"
                  variant={agent.is_active ? 'outline' : 'default'}
                  onClick={() => toggleActive(agent.id, agent.is_active)}
                  className="h-7 px-2 text-xs"
                >
                  {agent.is_active
                    ? <><UserX className="h-3.5 w-3.5 mr-1" />Deactivate</>
                    : <><UserCheck className="h-3.5 w-3.5 mr-1" />Activate</>}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input
                placeholder="Agent full name"
                value={addForm.full_name}
                onChange={e => setAddForm(p => ({ ...p, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="agent@example.com"
                value={addForm.email}
                onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={addForm.password}
                onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addAgent} loading={adding}>Create Agent</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
