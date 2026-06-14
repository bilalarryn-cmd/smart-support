import { addHours, isPast, parseISO } from 'date-fns'
import type { SlaRule, Ticket, TicketPriority } from '@/types'

export function calculateSlaDueDate(priority: TicketPriority, slaRules: SlaRule[], createdAt: Date = new Date()): Date | null {
  const rule = slaRules.find(r => r.priority === priority && r.is_active)
  if (!rule) return null
  return addHours(createdAt, rule.resolution_hours)
}

export function isSlaWarning(slaRule: SlaRule, ticket: Pick<Ticket, 'created_at' | 'sla_due_at' | 'sla_breached'>): boolean {
  if (ticket.sla_breached || !ticket.sla_due_at) return false

  const now = new Date()
  const dueAt = parseISO(ticket.sla_due_at)
  const createdAt = parseISO(ticket.created_at)

  const totalMs = dueAt.getTime() - createdAt.getTime()
  const elapsedMs = now.getTime() - createdAt.getTime()
  const percentage = (elapsedMs / totalMs) * 100

  return percentage >= slaRule.warning_threshold && percentage < 100
}

export function isSlaBreached(ticket: Pick<Ticket, 'sla_due_at' | 'sla_breached'>): boolean {
  if (ticket.sla_breached) return true
  if (!ticket.sla_due_at) return false
  return isPast(parseISO(ticket.sla_due_at))
}

export function getSlaProgressPercentage(ticket: Pick<Ticket, 'created_at' | 'sla_due_at'>): number {
  if (!ticket.sla_due_at) return 0

  const now = new Date()
  const dueAt = parseISO(ticket.sla_due_at)
  const createdAt = parseISO(ticket.created_at)

  const totalMs = dueAt.getTime() - createdAt.getTime()
  const elapsedMs = now.getTime() - createdAt.getTime()

  return Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)))
}
