'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TicketPriority, UserProfile } from '@/types'

interface Props {
  ticketId: string
  currentPriority: TicketPriority
  agents: Pick<UserProfile, 'id' | 'full_name'>[]
}

export function SlaEscalationActions({ ticketId, currentPriority, agents }: Props) {
  const [saving, setSaving] = useState(false)
  const [priority, setPriority] = useState(currentPriority)
  const [agentId, setAgentId] = useState('')

  const escalate = async () => {
    setSaving(true)
    const body: Record<string, string> = { priority }
    if (agentId) body.assigned_agent_id = agentId

    const res = await fetch(`/api/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!res.ok) { toast.error('Failed to escalate ticket'); return }
    toast.success('Ticket escalated successfully')
    window.location.reload()
  }

  return (
    <div className="flex flex-col gap-2 shrink-0 min-w-[160px]">
      <Select value={priority} onValueChange={v => setPriority(v as TicketPriority)}>
        <SelectTrigger className="h-8 text-xs w-full">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="critical">🚨 Critical</SelectItem>
          <SelectItem value="high">🔴 High</SelectItem>
          <SelectItem value="medium">🟡 Medium</SelectItem>
          <SelectItem value="low">🟢 Low</SelectItem>
        </SelectContent>
      </Select>
      {agents.length > 0 && (
        <Select value={agentId} onValueChange={setAgentId}>
          <SelectTrigger className="h-8 text-xs w-full">
            <SelectValue placeholder="Reassign agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Keep current</SelectItem>
            {agents.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button size="sm" onClick={escalate} loading={saving} className="h-8 text-xs">
        Escalate
      </Button>
    </div>
  )
}
