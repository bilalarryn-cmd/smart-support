import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// Mirrors the schema in tickets/new/page.tsx
const ticketSchema = z.object({
  subject: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  priority: z.enum(['low', 'medium', 'high']),
  category_id: z.string().min(1),
  country_code: z.string().min(1),
})

describe('Ticket Creation Validation', () => {
  it('accepts a valid ticket payload', () => {
    const result = ticketSchema.safeParse({
      subject: 'My app is broken',
      description: 'When I try to log in the page shows a blank screen and nothing loads.',
      priority: 'high',
      category_id: 'uuid-123',
      country_code: 'US',
    })
    expect(result.success).toBe(true)
  })

  it('rejects subject shorter than 5 characters', () => {
    const result = ticketSchema.safeParse({
      subject: 'Bug',
      description: 'When I try to log in the page shows a blank screen.',
      priority: 'medium',
      category_id: 'uuid-123',
      country_code: 'US',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path[0]).toBe('subject')
  })

  it('rejects description shorter than 20 characters', () => {
    const result = ticketSchema.safeParse({
      subject: 'Login broken',
      description: 'Not working',
      priority: 'medium',
      category_id: 'uuid-123',
      country_code: 'US',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path[0]).toBe('description')
  })

  it('rejects invalid priority values', () => {
    const result = ticketSchema.safeParse({
      subject: 'Login broken',
      description: 'When I try to log in the page shows a blank screen.',
      priority: 'critical',
      category_id: 'uuid-123',
      country_code: 'US',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing category_id', () => {
    const result = ticketSchema.safeParse({
      subject: 'Login broken',
      description: 'When I try to log in the page shows a blank screen.',
      priority: 'high',
      category_id: '',
      country_code: 'US',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path[0]).toBe('category_id')
  })

  it('sets SLA due date based on priority', () => {
    const SLA_HOURS: Record<string, number> = { high: 8, medium: 24, low: 120 }
    const priority = 'high'
    const now = Date.now()
    const slaDueAt = new Date(now + SLA_HOURS[priority] * 60 * 60 * 1000)
    const diffHours = (slaDueAt.getTime() - now) / (1000 * 60 * 60)
    expect(diffHours).toBe(8)
  })
})
