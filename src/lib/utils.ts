import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'
import type { TicketStatus, TicketPriority, SlaStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null, pattern = 'MMM d, yyyy') {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '—'
  return format(d, pattern)
}

export function formatDateTime(date: string | Date | null) {
  return formatDate(date, 'MMM d, yyyy h:mm a')
}

export function formatRelativeTime(date: string | Date | null) {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '—'
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getStatusLabel(status: TicketStatus): string {
  const labels: Record<TicketStatus, string> = {
    new: 'New',
    open: 'Open',
    waiting_for_customer: 'Waiting for Customer',
    resolved: 'Resolved',
    closed: 'Closed',
  }
  return labels[status]
}

export function getStatusColor(status: TicketStatus): string {
  const colors: Record<TicketStatus, string> = {
    new: 'bg-blue-100 text-blue-800 border-blue-200',
    open: 'bg-green-100 text-green-800 border-green-200',
    waiting_for_customer: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    resolved: 'bg-purple-100 text-purple-800 border-purple-200',
    closed: 'bg-gray-100 text-gray-800 border-gray-200',
  }
  return colors[status]
}

export function getPriorityLabel(priority: TicketPriority): string {
  const labels: Record<TicketPriority, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  }
  return labels[priority]
}

export function getPriorityColor(priority: TicketPriority): string {
  const colors: Record<TicketPriority, string> = {
    low: 'bg-gray-100 text-gray-700 border-gray-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    high: 'bg-red-100 text-red-700 border-red-200',
  }
  return colors[priority]
}

export function getSlaStatus(slaRule: { resolution_hours: number; warning_threshold: number } | null, ticket: { created_at: string; sla_due_at: string | null; sla_breached: boolean; status: TicketStatus }): SlaStatus {
  if (!slaRule || !ticket.sla_due_at || ['resolved', 'closed'].includes(ticket.status)) {
    return { percentage: 0, risk: 'safe', dueAt: null, hoursRemaining: null, label: 'N/A' }
  }

  const now = new Date()
  const dueAt = parseISO(ticket.sla_due_at)
  const createdAt = parseISO(ticket.created_at)

  const totalMs = dueAt.getTime() - createdAt.getTime()
  const elapsedMs = now.getTime() - createdAt.getTime()
  const percentage = Math.min(100, Math.round((elapsedMs / totalMs) * 100))

  const msRemaining = dueAt.getTime() - now.getTime()
  const hoursRemaining = msRemaining / (1000 * 60 * 60)

  let risk: SlaStatus['risk'] = 'safe'
  if (ticket.sla_breached || percentage >= 100) risk = 'breached'
  else if (percentage >= slaRule.warning_threshold) risk = 'warning'

  let label = ''
  if (risk === 'breached') label = 'SLA Breached'
  else if (hoursRemaining < 1) label = `${Math.round(hoursRemaining * 60)}m remaining`
  else label = `${hoursRemaining.toFixed(1)}h remaining`

  return { percentage, risk, dueAt, hoursRemaining, label }
}

export function generateTicketNumber(): string {
  return `TKT-${Date.now().toString().slice(-6)}`
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function isImageMimeType(mime: string): boolean {
  return mime.startsWith('image/')
}

export function isPdfMimeType(mime: string): boolean {
  return mime === 'application/pdf'
}

export function getMimeIcon(mime: string): string {
  if (isImageMimeType(mime)) return '🖼️'
  if (isPdfMimeType(mime)) return '📄'
  if (mime.includes('word') || mime.includes('document')) return '📝'
  if (mime.includes('sheet') || mime.includes('excel')) return '📊'
  return '📎'
}
