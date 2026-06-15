import { describe, it, expect } from 'vitest'
import {
  isSlaWarning,
  isSlaBreached,
  getSlaProgressPercentage,
  calculateSlaDueDate,
} from '@/lib/sla/calculator'
import type { SlaRule } from '@/types'

// ── SLA rules including critical (matches DB seed in /api/admin/setup)
const DEFAULT_SLA_RULES: SlaRule[] = [
  { id: '1', priority: 'critical', response_hours: 1,  resolution_hours: 4,   warning_threshold: 75, is_active: true, created_at: '', updated_at: '' },
  { id: '2', priority: 'high',     response_hours: 2,  resolution_hours: 8,   warning_threshold: 75, is_active: true, created_at: '', updated_at: '' },
  { id: '3', priority: 'medium',   response_hours: 8,  resolution_hours: 24,  warning_threshold: 75, is_active: true, created_at: '', updated_at: '' },
  { id: '4', priority: 'low',      response_hours: 48, resolution_hours: 120, warning_threshold: 75, is_active: true, created_at: '', updated_at: '' },
]

/** Pure SLA status calculation — matches cron job logic exactly */
function calculateSlaStatus(
  createdAt: Date,
  slaDueAt:  Date,
  warningThreshold: number,
  now = new Date()
): 'safe' | 'warning' | 'breached' {
  const totalMs   = slaDueAt.getTime()  - createdAt.getTime()
  const elapsedMs = now.getTime()       - createdAt.getTime()
  const percentage = (elapsedMs / totalMs) * 100

  if (now > slaDueAt)              return 'breached'
  if (percentage >= warningThreshold) return 'warning'
  return 'safe'
}

function addHoursToDate(createdAt: Date, resolutionHours: number): Date {
  return new Date(createdAt.getTime() + resolutionHours * 60 * 60 * 1000)
}

function shouldAutoClose(resolvedAt: Date, autoCloseAfterHours: number, now = new Date()): boolean {
  const hoursSinceResolved = (now.getTime() - resolvedAt.getTime()) / (1000 * 60 * 60)
  return hoursSinceResolved >= autoCloseAfterHours
}

/** Cron job: should send breach email only if not already flagged */
function shouldSendBreachEmail(ticket: { sla_breached: boolean; sla_due_at: string | null }): boolean {
  if (ticket.sla_breached) return false // already sent — deduplication
  if (!ticket.sla_due_at) return false
  return new Date() > new Date(ticket.sla_due_at)
}

/** Cron job: should send warning email only if not already warned and not yet breached */
function shouldSendWarningEmail(ticket: {
  sla_warned:   boolean
  sla_breached: boolean
  sla_due_at:   string | null
  created_at:   string
}, threshold: number): boolean {
  if (ticket.sla_warned || ticket.sla_breached) return false
  if (!ticket.sla_due_at) return false
  const status = calculateSlaStatus(
    new Date(ticket.created_at),
    new Date(ticket.sla_due_at),
    threshold
  )
  return status === 'warning'
}

// ─────────────────────────────────────────────────────────────────────────────
describe('SLA Status Calculation', () => {
  it('returns "safe" when well within SLA deadline', () => {
    const now     = new Date()
    const created = new Date(now.getTime() - 1 * 60 * 60 * 1000) // 1h ago
    const due     = new Date(now.getTime() + 7 * 60 * 60 * 1000) // due in 7h (12.5% elapsed)
    expect(calculateSlaStatus(created, due, 75, now)).toBe('safe')
  })

  it('returns "warning" when elapsed % >= warning threshold', () => {
    const now     = new Date()
    const created = new Date(now.getTime() - 7 * 60 * 60 * 1000) // 7h ago
    const due     = new Date(now.getTime() + 1 * 60 * 60 * 1000) // due in 1h (87.5% elapsed)
    expect(calculateSlaStatus(created, due, 75, now)).toBe('warning')
  })

  it('returns "breached" when past SLA deadline', () => {
    const now     = new Date()
    const created = new Date(now.getTime() - 10 * 60 * 60 * 1000) // 10h ago
    const due     = new Date(now.getTime() - 2  * 60 * 60 * 1000) // was due 2h ago
    expect(calculateSlaStatus(created, due, 75, now)).toBe('breached')
  })

  it('returns "safe" at exactly 0% elapsed', () => {
    const now     = new Date()
    const created = now
    const due     = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    expect(calculateSlaStatus(created, due, 75, now)).toBe('safe')
  })

  it('returns "warning" at exactly 75% elapsed (threshold boundary)', () => {
    const totalHours = 8
    const now        = new Date()
    const created    = new Date(now.getTime() - 6 * 60 * 60 * 1000) // 6h ago = 75%
    const due        = new Date(created.getTime() + totalHours * 60 * 60 * 1000)
    expect(calculateSlaStatus(created, due, 75, now)).toBe('warning')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('SLA Due Date Calculation', () => {
  it('calculates correct due date for critical priority (4h)', () => {
    const created = new Date('2024-01-01T08:00:00Z')
    const due     = addHoursToDate(created, 4)
    expect(due.toISOString()).toBe('2024-01-01T12:00:00.000Z')
  })

  it('calculates correct due date for high priority (8h)', () => {
    const created = new Date('2024-01-01T08:00:00Z')
    const due     = addHoursToDate(created, 8)
    expect(due.toISOString()).toBe('2024-01-01T16:00:00.000Z')
  })

  it('calculates correct due date for medium priority (24h)', () => {
    const created = new Date('2024-01-01T00:00:00Z')
    const due     = addHoursToDate(created, 24)
    expect(due.toISOString()).toBe('2024-01-02T00:00:00.000Z')
  })

  it('calculates correct due date for low priority (120h = 5 days)', () => {
    const created = new Date('2024-01-01T00:00:00Z')
    const due     = addHoursToDate(created, 120)
    expect(due.toISOString()).toBe('2024-01-06T00:00:00.000Z')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('SLA Priority Ordering', () => {
  it('critical has shorter deadline than high', () => {
    const critical = DEFAULT_SLA_RULES.find(r => r.priority === 'critical')!
    const high     = DEFAULT_SLA_RULES.find(r => r.priority === 'high')!
    expect(critical.resolution_hours).toBeLessThan(high.resolution_hours)
  })

  it('high has shorter deadline than medium', () => {
    const high   = DEFAULT_SLA_RULES.find(r => r.priority === 'high')!
    const medium = DEFAULT_SLA_RULES.find(r => r.priority === 'medium')!
    expect(high.resolution_hours).toBeLessThan(medium.resolution_hours)
  })

  it('medium has shorter deadline than low', () => {
    const medium = DEFAULT_SLA_RULES.find(r => r.priority === 'medium')!
    const low    = DEFAULT_SLA_RULES.find(r => r.priority === 'low')!
    expect(medium.resolution_hours).toBeLessThan(low.resolution_hours)
  })

  it('critical has the shortest response time of all priorities', () => {
    const sorted = [...DEFAULT_SLA_RULES].sort((a, b) => a.response_hours - b.response_hours)
    expect(sorted[0].priority).toBe('critical')
  })

  it('all four priorities are present in SLA rules', () => {
    const priorities = DEFAULT_SLA_RULES.map(r => r.priority)
    expect(priorities).toContain('critical')
    expect(priorities).toContain('high')
    expect(priorities).toContain('medium')
    expect(priorities).toContain('low')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('SLA Auto-Close Logic', () => {
  it('auto-closes resolved ticket after 72 hours', () => {
    const resolvedAt = new Date(Date.now() - 73 * 60 * 60 * 1000) // 73h ago
    expect(shouldAutoClose(resolvedAt, 72)).toBe(true)
  })

  it('does NOT auto-close ticket resolved only 48 hours ago', () => {
    const resolvedAt = new Date(Date.now() - 48 * 60 * 60 * 1000)
    expect(shouldAutoClose(resolvedAt, 72)).toBe(false)
  })

  it('auto-closes exactly at the threshold (72h)', () => {
    const resolvedAt = new Date(Date.now() - 72 * 60 * 60 * 1000)
    expect(shouldAutoClose(resolvedAt, 72)).toBe(true)
  })

  it('does NOT auto-close unresolved tickets (0h since resolution)', () => {
    const resolvedAt = new Date() // just now
    expect(shouldAutoClose(resolvedAt, 72)).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('SLA Escalation — Deduplication (Cron Job Logic)', () => {
  const futureDate = new Date(Date.now() + 99 * 60 * 60 * 1000).toISOString()
  const pastDate   = new Date(Date.now() - 2  * 60 * 60 * 1000).toISOString()
  const now        = new Date().toISOString()

  it('sends breach email when ticket is past deadline and not yet flagged', () => {
    expect(shouldSendBreachEmail({ sla_breached: false, sla_due_at: pastDate })).toBe(true)
  })

  it('does NOT send breach email when already flagged (deduplication)', () => {
    expect(shouldSendBreachEmail({ sla_breached: true, sla_due_at: pastDate })).toBe(false)
  })

  it('does NOT send breach email when deadline is in the future', () => {
    expect(shouldSendBreachEmail({ sla_breached: false, sla_due_at: futureDate })).toBe(false)
  })

  it('does NOT send breach email when sla_due_at is null', () => {
    expect(shouldSendBreachEmail({ sla_breached: false, sla_due_at: null })).toBe(false)
  })

  it('sends warning email when in warning zone and not yet warned', () => {
    const createdAt = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString() // 7h ago
    const dueAt     = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString() // 1h from now (87.5%)
    const result = shouldSendWarningEmail(
      { sla_warned: false, sla_breached: false, sla_due_at: dueAt, created_at: createdAt },
      75
    )
    expect(result).toBe(true)
  })

  it('does NOT send warning email when already warned (deduplication)', () => {
    const createdAt = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString()
    const dueAt     = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString()
    const result = shouldSendWarningEmail(
      { sla_warned: true, sla_breached: false, sla_due_at: dueAt, created_at: createdAt },
      75
    )
    expect(result).toBe(false)
  })

  it('does NOT send warning email when ticket is already breached', () => {
    const createdAt = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString()
    const result = shouldSendWarningEmail(
      { sla_warned: false, sla_breached: true, sla_due_at: pastDate, created_at: createdAt },
      75
    )
    expect(result).toBe(false)
  })

  it('does NOT send warning email when comfortably within SLA', () => {
    const createdAt = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1h ago
    const dueAt     = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString() // 7h from now
    const result = shouldSendWarningEmail(
      { sla_warned: false, sla_breached: false, sla_due_at: dueAt, created_at: createdAt },
      75
    )
    expect(result).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests that import and exercise the real calculator functions directly.
// calculateSlaDueDate(priority, slaRules[], createdAt?) → Date | null
describe('SLA Calculator (from @/lib/sla/calculator)', () => {
  const mockSlaRule: SlaRule = {
    id: 'test', priority: 'high', response_hours: 2,
    resolution_hours: 8, warning_threshold: 75,
    is_active: true, created_at: '', updated_at: '',
  }

  // isSlaBreached ─────────────────────────────────────────────────────────────
  it('isSlaBreached: returns true for ticket past due date', () => {
    const pastDue = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    expect(isSlaBreached({ sla_due_at: pastDue, sla_breached: false })).toBe(true)
  })

  it('isSlaBreached: returns false for ticket not yet due', () => {
    const futureDue = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    expect(isSlaBreached({ sla_due_at: futureDue, sla_breached: false })).toBe(false)
  })

  it('isSlaBreached: returns true when sla_breached flag already set (even if not past due)', () => {
    const futureDue = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    expect(isSlaBreached({ sla_due_at: futureDue, sla_breached: true })).toBe(true)
  })

  it('isSlaBreached: returns false when sla_due_at is null', () => {
    expect(isSlaBreached({ sla_due_at: null, sla_breached: false })).toBe(false)
  })

  // isSlaWarning ──────────────────────────────────────────────────────────────
  it('isSlaWarning: returns true when in warning zone (87.5% elapsed)', () => {
    const createdAt = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString()
    const slaDueAt  = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString()
    expect(isSlaWarning(mockSlaRule, { created_at: createdAt, sla_due_at: slaDueAt, sla_breached: false })).toBe(true)
  })

  it('isSlaWarning: returns false when past deadline (percentage > 100, not < 100)', () => {
    const createdAt = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString()
    const slaDueAt  = new Date(Date.now() - 2  * 60 * 60 * 1000).toISOString()
    expect(isSlaWarning(mockSlaRule, { created_at: createdAt, sla_due_at: slaDueAt, sla_breached: false })).toBe(false)
  })

  it('isSlaWarning: returns false when sla_breached flag is set', () => {
    const createdAt = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString()
    const slaDueAt  = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString()
    expect(isSlaWarning(mockSlaRule, { created_at: createdAt, sla_due_at: slaDueAt, sla_breached: true })).toBe(false)
  })

  // getSlaProgressPercentage ──────────────────────────────────────────────────
  it('getSlaProgressPercentage: returns 0 when no sla_due_at', () => {
    const createdAt = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    expect(getSlaProgressPercentage({ created_at: createdAt, sla_due_at: null })).toBe(0)
  })

  it('getSlaProgressPercentage: clamps at 100 for breached tickets', () => {
    const createdAt = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString()
    const slaDueAt  = new Date(Date.now() - 2  * 60 * 60 * 1000).toISOString()
    expect(getSlaProgressPercentage({ created_at: createdAt, sla_due_at: slaDueAt })).toBe(100)
  })

  it('getSlaProgressPercentage: returns ~50 for ticket halfway through SLA', () => {
    const createdAt = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    const slaDueAt  = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
    const pct = getSlaProgressPercentage({ created_at: createdAt, sla_due_at: slaDueAt })
    expect(pct).toBeGreaterThanOrEqual(49)
    expect(pct).toBeLessThanOrEqual(51)
  })

  // calculateSlaDueDate ───────────────────────────────────────────────────────
  it('calculateSlaDueDate: returns correct date for critical priority (4h)', () => {
    const created = new Date('2024-01-01T08:00:00Z')
    const due     = calculateSlaDueDate('critical', DEFAULT_SLA_RULES, created)
    expect(due?.toISOString()).toBe('2024-01-01T12:00:00.000Z')
  })

  it('calculateSlaDueDate: returns correct date for low priority (120h)', () => {
    const created = new Date('2024-01-01T00:00:00Z')
    const due     = calculateSlaDueDate('low', DEFAULT_SLA_RULES, created)
    expect(due?.toISOString()).toBe('2024-01-06T00:00:00.000Z')
  })

  it('calculateSlaDueDate: returns null when no matching active rule', () => {
    const result = calculateSlaDueDate('critical', [], new Date())
    expect(result).toBeNull()
  })
})
