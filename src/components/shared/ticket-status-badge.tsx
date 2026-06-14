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
  const variantMap: Record<TicketPriority, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary'> = {
    low: 'secondary',
    medium: 'warning',
    high: 'danger',
  }
  return <Badge variant={variantMap[priority]}>{getPriorityLabel(priority)}</Badge>
}
