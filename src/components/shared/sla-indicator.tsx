'use client'

import React from 'react'
import { cn, getSlaStatus } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Clock, AlertTriangle, AlertCircle } from 'lucide-react'
import type { SlaRule, Ticket } from '@/types'

interface SlaIndicatorProps {
  ticket: Pick<Ticket, 'created_at' | 'sla_due_at' | 'sla_breached' | 'status'>
  slaRule: { resolution_hours: number; warning_threshold: number } | null
  compact?: boolean
}

export function SlaIndicator({ ticket, slaRule, compact = false }: SlaIndicatorProps) {
  const sla = getSlaStatus(slaRule, ticket)

  if (!slaRule || !ticket.sla_due_at) {
    return <span className="text-xs text-slate-400">No SLA</span>
  }

  const riskConfig = {
    safe: {
      color: 'text-emerald-600',
      bar: 'bg-emerald-500',
      bg: 'bg-emerald-50 border-emerald-100',
      icon: Clock,
      label: 'On Track',
    },
    warning: {
      color: 'text-amber-600',
      bar: 'bg-amber-500',
      bg: 'bg-amber-50 border-amber-100',
      icon: AlertTriangle,
      label: 'At Risk',
    },
    breached: {
      color: 'text-red-600',
      bar: 'bg-red-500',
      bg: 'bg-red-50 border-red-100',
      icon: AlertCircle,
      label: 'Breached',
    },
  }

  const cfg = riskConfig[sla.risk]
  const Icon = cfg.icon

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
        <span className={cn('text-xs font-medium', cfg.color)}>{sla.label}</span>
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border p-3 space-y-2', cfg.bg)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={cn('h-4 w-4', cfg.color)} />
          <span className={cn('text-sm font-semibold', cfg.color)}>{cfg.label}</span>
        </div>
        <span className="text-xs text-slate-500">{sla.percentage}%</span>
      </div>
      <Progress
        value={sla.percentage}
        indicatorColor={cfg.bar}
        className="h-1.5"
      />
      <p className={cn('text-xs', cfg.color)}>{sla.label}</p>
    </div>
  )
}
