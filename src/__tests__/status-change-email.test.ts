import { describe, it, expect } from 'vitest'

// ── Types
type TicketStatus = 'new' | 'open' | 'waiting_for_customer' | 'resolved' | 'closed'

// ── Business logic (mirrors /api/tickets/[id]/route.ts PATCH handler)

function shouldSendStatusChangeEmail(oldStatus: TicketStatus, newStatus: TicketStatus): boolean {
  return oldStatus !== newStatus
}

/**
 * Determines which email template to use based on the new status.
 * Closed/resolved → 'ticket_closed' template (different HTML, different subject).
 * All other changes → 'status_change' template.
 */
function getEmailTemplateType(newStatus: TicketStatus): 'ticket_closed' | 'status_change' {
  if (newStatus === 'closed' || newStatus === 'resolved') return 'ticket_closed'
  return 'status_change'
}

function buildStatusChangeEmailPayload(
  ticketId:  string,
  newStatus: TicketStatus,
  oldStatus: TicketStatus
) {
  return {
    ticketId,
    type: getEmailTemplateType(newStatus),
    newStatus,
    oldStatus,
  }
}

function getStatusEmailSubject(ticketNumber: number, newStatus: TicketStatus): string {
  const labels: Record<TicketStatus, string> = {
    new:                  'New',
    open:                 'Open',
    waiting_for_customer: 'Waiting for Your Reply',
    resolved:             'Resolved',
    closed:               'Closed',
  }
  return `Status Update — Ticket #${ticketNumber} is now ${labels[newStatus]}`
}

function getClosedEmailSubject(ticketNumber: number, status: 'resolved' | 'closed'): string {
  return `Ticket #${ticketNumber} has been ${status}`
}

/** Whether to timestamp resolved_at or closed_at when status changes */
function getTimestampField(newStatus: TicketStatus): 'resolved_at' | 'closed_at' | null {
  if (newStatus === 'resolved') return 'resolved_at'
  if (newStatus === 'closed')   return 'closed_at'
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
describe('Status Change Email — Trigger Logic', () => {
  it('sends email when status changes from new to open', () => {
    expect(shouldSendStatusChangeEmail('new', 'open')).toBe(true)
  })

  it('sends email when status changes to resolved', () => {
    expect(shouldSendStatusChangeEmail('open', 'resolved')).toBe(true)
  })

  it('sends email when status changes to waiting_for_customer', () => {
    expect(shouldSendStatusChangeEmail('open', 'waiting_for_customer')).toBe(true)
  })

  it('sends email when status changes to closed', () => {
    expect(shouldSendStatusChangeEmail('resolved', 'closed')).toBe(true)
  })

  it('sends email for every distinct status transition', () => {
    const transitions: [TicketStatus, TicketStatus][] = [
      ['new', 'open'],
      ['open', 'waiting_for_customer'],
      ['waiting_for_customer', 'open'],
      ['open', 'resolved'],
      ['resolved', 'closed'],
    ]
    for (const [from, to] of transitions) {
      expect(shouldSendStatusChangeEmail(from, to), `${from} → ${to}`).toBe(true)
    }
  })

  it('does NOT send email when status is unchanged', () => {
    expect(shouldSendStatusChangeEmail('open', 'open')).toBe(false)
  })

  it('does NOT send email for same status regardless of which status', () => {
    const statuses: TicketStatus[] = ['new', 'open', 'waiting_for_customer', 'resolved', 'closed']
    for (const s of statuses) {
      expect(shouldSendStatusChangeEmail(s, s), `same status: ${s}`).toBe(false)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('Status Change Email — Template Selection', () => {
  it('uses "ticket_closed" template when ticket is resolved', () => {
    expect(getEmailTemplateType('resolved')).toBe('ticket_closed')
  })

  it('uses "ticket_closed" template when ticket is closed', () => {
    expect(getEmailTemplateType('closed')).toBe('ticket_closed')
  })

  it('uses "status_change" template for open transition', () => {
    expect(getEmailTemplateType('open')).toBe('status_change')
  })

  it('uses "status_change" template for waiting_for_customer', () => {
    expect(getEmailTemplateType('waiting_for_customer')).toBe('status_change')
  })

  it('uses "status_change" template for new status', () => {
    expect(getEmailTemplateType('new')).toBe('status_change')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('Status Change Email — Payload Builder', () => {
  it('builds correct payload for open→resolved transition', () => {
    const payload = buildStatusChangeEmailPayload('ticket-123', 'resolved', 'open')
    expect(payload.type).toBe('ticket_closed')
    expect(payload.newStatus).toBe('resolved')
    expect(payload.oldStatus).toBe('open')
    expect(payload.ticketId).toBe('ticket-123')
  })

  it('builds correct payload for new→open transition', () => {
    const payload = buildStatusChangeEmailPayload('ticket-456', 'open', 'new')
    expect(payload.type).toBe('status_change')
    expect(payload.newStatus).toBe('open')
    expect(payload.oldStatus).toBe('new')
  })

  it('resolved→closed uses ticket_closed template', () => {
    const payload = buildStatusChangeEmailPayload('ticket-789', 'closed', 'resolved')
    expect(payload.type).toBe('ticket_closed')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('Status Change Email — Subject Lines', () => {
  it('generates correct subject for resolved status', () => {
    expect(getStatusEmailSubject(1001, 'resolved')).toContain('Resolved')
    expect(getStatusEmailSubject(1001, 'resolved')).toContain('1001')
  })

  it('generates correct subject for waiting_for_customer', () => {
    expect(getStatusEmailSubject(1001, 'waiting_for_customer')).toContain('Waiting')
  })

  it('generates correct subject for closed status', () => {
    expect(getStatusEmailSubject(1001, 'closed')).toContain('Closed')
  })

  it('generates correct subject for open status', () => {
    expect(getStatusEmailSubject(1001, 'open')).toContain('Open')
  })

  it('includes ticket number in all subjects', () => {
    const statuses: TicketStatus[] = ['new', 'open', 'waiting_for_customer', 'resolved', 'closed']
    for (const status of statuses) {
      expect(getStatusEmailSubject(2024, status)).toContain('2024')
    }
  })

  it('uses correct subject for closed/resolved emails', () => {
    expect(getClosedEmailSubject(1001, 'resolved')).toContain('resolved')
    expect(getClosedEmailSubject(1001, 'closed')).toContain('closed')
    expect(getClosedEmailSubject(1001, 'resolved')).toContain('1001')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('Status Change Email — Timestamp Fields', () => {
  it('sets resolved_at when status becomes resolved', () => {
    expect(getTimestampField('resolved')).toBe('resolved_at')
  })

  it('sets closed_at when status becomes closed', () => {
    expect(getTimestampField('closed')).toBe('closed_at')
  })

  it('sets no timestamp for open status', () => {
    expect(getTimestampField('open')).toBeNull()
  })

  it('sets no timestamp for waiting_for_customer status', () => {
    expect(getTimestampField('waiting_for_customer')).toBeNull()
  })

  it('sets no timestamp for new status', () => {
    expect(getTimestampField('new')).toBeNull()
  })
})
