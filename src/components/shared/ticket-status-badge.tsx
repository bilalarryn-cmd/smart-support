import React from 'react'
import { Badge } from '@/components/ui/badge'
import { getStatusLabel, getPriorityLabel } from '@/lib/utils'
import type { TicketStatus, TicketPriority } from '@/types'

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const variantMap: Record<TicketStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary'> = {
    new: 'info',
    open: 'success',
    waiting_for_customer: 'warning',
    resolved: 'default',
    closed: 'secondary',
  }
  return <Badge variant={variantMap[status]}>{getStatusLabel(status)}</Badge>
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  if (priority === 'critical') {
    return <Badge variant="danger" className="bg-purple-600 text-white border-purple-600">🚨 Critical</Badge>
  }
  const variantMap: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary'> = {
    low: 'secondary',
    medium: 'warning',
    high: 'danger',
  }
  return <Badge variant={variantMap[priority] ?? 'default'}>{getPriorityLabel(priority)}</Badge>
}
