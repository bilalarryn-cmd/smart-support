import { describe, it, expect } from 'vitest'

// Tests the core SLA calculation and escalation logic

interface SlaRule {
  priority: 'low' | 'medium' | 'high'
  response_hours: number
  resolution_hours: number
  warning_threshold: number // percentage (0-100)
}

const DEFAULT_SLA_RULES: SlaRule[] = [
  { priority: 'high',   response_hours: 2,  resolution_hours: 8,   warning_threshold: 75 },
  { priority: 'medium', response_hours: 8,  resolution_hours: 24,  warning_threshold: 75 },
  { priority: 'low',    response_hours: 48, resolution_hours: 120, warning_threshold: 75 },
]

function calculateSlaStatus(
  createdAt: Date,
  slaDueAt: Date,
  warningThreshold: number,
  now = new Date()
): 'ok' | 'warning' | 'breached' {
  const totalMs = slaDueAt.getTime() - createdAt.getTime()
  const elapsedMs = now.getTime() - createdAt.getTime()
  const percentage = (elapsedMs / totalMs) * 100

  if (now > slaDueAt) return 'breached'
  if (percentage >= warningThreshold) return 'warning'
  return 'ok'
}

function calculateSlaDueDate(createdAt: Date, resolutionHours: number): Date {
  return new Date(createdAt.getTime() + resolutionHours * 60 * 60 * 1000)
}

function shouldAutoClose(resolvedAt: Date, autoCloseAfterHours: number, now = new Date()): boolean {
  const hoursSinceResolved = (now.getTime() - resolvedAt.getTime()) / (1000 * 60 * 60)
  return hoursSinceResolved >= autoCloseAfterHours
}

describe('SLA Logic', () => {
  it('returns "ok" when well within SLA deadline', () => {
    const now = new Date()
    const created = new Date(now.getTime() - 1 * 60 * 60 * 1000) // 1 hour ago
    const due = new Date(now.getTime() + 7 * 60 * 60 * 1000)     // due in 7 hours
    const status = calculateSlaStatus(created, due, 75, now)
    expect(status).toBe('ok')
  })

  it('returns "warning" when past warning threshold', () => {
    const now = new Date()
    const created = new Date(now.getTime() - 7 * 60 * 60 * 1000) // 7 hours ago
    const due = new Date(now.getTime() + 1 * 60 * 60 * 1000)     // due in 1 hour (87.5% elapsed)
    const status = calculateSlaStatus(created, due, 75, now)
    expect(status).toBe('warning')
  })

  it('returns "breached" when past SLA deadline', () => {
    const now = new Date()
    const created = new Date(now.getTime() - 10 * 60 * 60 * 1000) // 10 hours ago
    const due = new Date(now.getTime() - 2 * 60 * 60 * 1000)      // was due 2 hours ago
    const status = calculateSlaStatus(created, due, 75, now)
    expect(status).toBe('breached')
  })

  it('calculates correct SLA due date for high priority (8h)', () => {
    const created = new Date('2024-01-01T08:00:00Z')
    const due = calculateSlaDueDate(created, 8)
    expect(due.toISOString()).toBe('2024-01-01T16:00:00.000Z')
  })

  it('calculates correct SLA due date for low priority (120h)', () => {
    const created = new Date('2024-01-01T00:00:00Z')
    const due = calculateSlaDueDate(created, 120)
    expect(due.toISOString()).toBe('2024-01-06T00:00:00.000Z')
  })

  it('auto-closes resolved ticket after 72 hours', () => {
    const resolvedAt = new Date(Date.now() - 73 * 60 * 60 * 1000) // 73h ago
    expect(shouldAutoClose(resolvedAt, 72)).toBe(true)
  })

  it('does NOT auto-close ticket resolved only 24 hours ago', () => {
    const resolvedAt = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24h ago
    expect(shouldAutoClose(resolvedAt, 72)).toBe(false)
  })

  it('high priority has shorter SLA than low priority', () => {
    const high = DEFAULT_SLA_RULES.find(r => r.priority === 'high')!
    const low  = DEFAULT_SLA_RULES.find(r => r.priority === 'low')!
    expect(high.resolution_hours).toBeLessThan(low.resolution_hours)
  })
})
