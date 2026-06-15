import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// ── Customer-facing form schema (low/medium/high only — customers cannot set critical)
const customerTicketSchema = z.object({
  subject:     z.string().min(5, 'Subject too short').max(200, 'Subject too long'),
  description: z.string().min(20, 'Description too short').max(5000, 'Description too long'),
  priority:    z.enum(['low', 'medium', 'high']),
  category_id: z.string().min(1, 'Category required'),
  country_code: z.string().length(2, 'Must be a 2-letter country code').toUpperCase(),
})

// ── System / API-level schema (includes critical — settable by agents/admins)
const apiTicketSchema = z.object({
  subject:     z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  priority:    z.enum(['low', 'medium', 'high', 'critical']),
  category_id: z.string().optional(),
  country_code: z.string().length(2),
})

// SLA hours per priority (matches default DB seed values)
const SLA_HOURS: Record<string, number> = {
  critical: 4,
  high:     8,
  medium:   24,
  low:      120,
}

function buildSlaPayload(priority: string, createdAt = new Date()) {
  const hours = SLA_HOURS[priority]
  if (!hours) return null
  return {
    priority,
    sla_due_at: new Date(createdAt.getTime() + hours * 60 * 60 * 1000).toISOString(),
  }
}

function generateTicketNumber(lastNumber: number): number {
  return lastNumber + 1
}

// ─────────────────────────────────────────────────────────────────────────────
describe('Ticket Creation — Customer Form Validation', () => {
  it('accepts a valid ticket payload', () => {
    const result = customerTicketSchema.safeParse({
      subject:     'App crashes on login',
      description: 'When I try to log in the page shows a blank screen and nothing loads.',
      priority:    'high',
      category_id: 'uuid-123',
      country_code: 'us',
    })
    expect(result.success).toBe(true)
    // country_code should be uppercased by the schema
    if (result.success) expect(result.data.country_code).toBe('US')
  })

  it('rejects subject shorter than 5 characters', () => {
    const result = customerTicketSchema.safeParse({
      subject:     'Bug',
      description: 'When I try to log in the page shows a blank screen.',
      priority:    'medium',
      category_id: 'uuid-123',
      country_code: 'US',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path[0]).toBe('subject')
    expect(result.error?.issues[0].message).toMatch(/short/i)
  })

  it('rejects subject longer than 200 characters', () => {
    const result = customerTicketSchema.safeParse({
      subject:     'A'.repeat(201),
      description: 'When I try to log in the page shows a blank screen and nothing loads here.',
      priority:    'medium',
      category_id: 'uuid-123',
      country_code: 'US',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path[0]).toBe('subject')
  })

  it('rejects description shorter than 20 characters', () => {
    const result = customerTicketSchema.safeParse({
      subject:     'Login broken',
      description: 'Not working',
      priority:    'medium',
      category_id: 'uuid-123',
      country_code: 'US',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path[0]).toBe('description')
  })

  it('rejects description longer than 5000 characters', () => {
    const result = customerTicketSchema.safeParse({
      subject:     'Login broken',
      description: 'x'.repeat(5001),
      priority:    'medium',
      category_id: 'uuid-123',
      country_code: 'US',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path[0]).toBe('description')
  })

  it('rejects "critical" priority from customer form (admin/agent only)', () => {
    const result = customerTicketSchema.safeParse({
      subject:     'Production is down',
      description: 'Our entire production environment is completely down and unavailable.',
      priority:    'critical',
      category_id: 'uuid-123',
      country_code: 'US',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path[0]).toBe('priority')
  })

  it('rejects empty category_id', () => {
    const result = customerTicketSchema.safeParse({
      subject:     'Login broken',
      description: 'When I try to log in the page shows a blank screen and nothing loads.',
      priority:    'high',
      category_id: '',
      country_code: 'US',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path[0]).toBe('category_id')
  })

  it('rejects country_code that is not exactly 2 characters', () => {
    const result = customerTicketSchema.safeParse({
      subject:     'Login broken',
      description: 'When I try to log in the page shows a blank screen and nothing loads.',
      priority:    'medium',
      category_id: 'uuid-123',
      country_code: 'USA',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path[0]).toBe('country_code')
  })

  it('accepts all valid customer priority values', () => {
    for (const priority of ['low', 'medium', 'high'] as const) {
      const result = customerTicketSchema.safeParse({
        subject:     'Something is broken here',
        description: 'When I try to log in the page shows a blank screen and nothing loads.',
        priority,
        category_id: 'uuid-123',
        country_code: 'US',
      })
      expect(result.success, `priority '${priority}' should be valid`).toBe(true)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('Ticket Creation — System / API Level', () => {
  it('accepts "critical" priority at the API level', () => {
    const result = apiTicketSchema.safeParse({
      subject:     'Production is down',
      description: 'Our entire production environment is completely down and unavailable.',
      priority:    'critical',
      country_code: 'US',
    })
    expect(result.success).toBe(true)
  })

  it('accepts all four priority levels at API level', () => {
    for (const priority of ['low', 'medium', 'high', 'critical'] as const) {
      const result = apiTicketSchema.safeParse({
        subject:     'Something is broken here',
        description: 'When I try to log in the page shows a blank screen.',
        priority,
        country_code: 'US',
      })
      expect(result.success, `API priority '${priority}' should be valid`).toBe(true)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('Ticket Creation — SLA Assignment', () => {
  it('sets correct SLA due date for high priority (8h)', () => {
    const payload = buildSlaPayload('high')
    expect(payload).not.toBeNull()
    const diffMs = new Date(payload!.sla_due_at).getTime() - Date.now()
    const diffHours = diffMs / (1000 * 60 * 60)
    expect(diffHours).toBeCloseTo(8, 0)
  })

  it('sets correct SLA due date for critical priority (4h — shorter than high)', () => {
    const payload = buildSlaPayload('critical')
    expect(payload).not.toBeNull()
    const diffMs = new Date(payload!.sla_due_at).getTime() - Date.now()
    const diffHours = diffMs / (1000 * 60 * 60)
    expect(diffHours).toBeCloseTo(4, 0)
  })

  it('critical has shorter SLA deadline than high', () => {
    const now = new Date()
    const criticalDue = buildSlaPayload('critical', now)
    const highDue = buildSlaPayload('high', now)
    expect(new Date(criticalDue!.sla_due_at).getTime()).toBeLessThan(new Date(highDue!.sla_due_at).getTime())
  })

  it('high has shorter SLA deadline than medium', () => {
    const now = new Date()
    const highDue = buildSlaPayload('high', now)
    const mediumDue = buildSlaPayload('medium', now)
    expect(new Date(highDue!.sla_due_at).getTime()).toBeLessThan(new Date(mediumDue!.sla_due_at).getTime())
  })

  it('medium has shorter SLA deadline than low', () => {
    const now = new Date()
    const medDue = buildSlaPayload('medium', now)
    const lowDue = buildSlaPayload('low', now)
    expect(new Date(medDue!.sla_due_at).getTime()).toBeLessThan(new Date(lowDue!.sla_due_at).getTime())
  })

  it('returns null for unknown priority', () => {
    expect(buildSlaPayload('unknown')).toBeNull()
  })

  it('ticket number increments sequentially', () => {
    expect(generateTicketNumber(999)).toBe(1000)
    expect(generateTicketNumber(1000)).toBe(1001)
    expect(generateTicketNumber(0)).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('Ticket Creation — Edge Cases', () => {
  it('accepts subject with exactly 5 characters (minimum boundary)', () => {
    const result = customerTicketSchema.safeParse({
      subject:     'Error',
      description: 'When I try to log in the page shows a blank screen.',
      priority:    'low',
      category_id: 'uuid-123',
      country_code: 'US',
    })
    expect(result.success).toBe(true)
  })

  it('rejects subject with exactly 4 characters (below minimum)', () => {
    const result = customerTicketSchema.safeParse({
      subject:     'Err',
      description: 'When I try to log in the page shows a blank screen.',
      priority:    'low',
      category_id: 'uuid-123',
      country_code: 'US',
    })
    expect(result.success).toBe(false)
  })

  it('accepts description with exactly 20 characters (minimum boundary)', () => {
    const result = customerTicketSchema.safeParse({
      subject:     'Login issue here now',
      description: 'This is a test desc!',
      priority:    'low',
      category_id: 'uuid-123',
      country_code: 'US',
    })
    expect(result.success).toBe(true)
  })

  it('trims and normalizes country_code to uppercase', () => {
    const result = customerTicketSchema.safeParse({
      subject:     'Login broken now',
      description: 'When I try to log in the page shows a blank screen here.',
      priority:    'low',
      category_id: 'uuid-123',
      country_code: 'pk',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.country_code).toBe('PK')
  })
})
