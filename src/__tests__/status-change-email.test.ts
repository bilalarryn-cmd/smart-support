import { describe, it, expect } from 'vitest'

// Tests the status-change email trigger logic

type TicketStatus = 'new' | 'open' | 'waiting_for_customer' | 'resolved' | 'closed'

function shouldSendStatusChangeEmail(oldStatus: TicketStatus, newStatus: TicketStatus): boolean {
  // Always send when status actually changes
  return oldStatus !== newStatus
}

function buildStatusChangeEmailPayload(ticketId: string, newStatus: TicketStatus, oldStatus: TicketStatus) {
  return {
    ticketId,
    type: 'status_change',
    newStatus,
    oldStatus,
  }
}

function getStatusEmailSubject(ticketNumber: number, newStatus: TicketStatus): string {
  const labels: Record<TicketStatus, string> = {
    new: 'New',
    open: 'Open',
    waiting_for_customer: 'Waiting for Your Reply',
    resolved: 'Resolved',
    closed: 'Closed',
  }
  return `Status Update — Ticket #${ticketNumber} is now ${labels[newStatus]}`
}

describe('Status Change Email', () => {
  it('sends email when status changes from new to open', () => {
    expect(shouldSendStatusChangeEmail('new', 'open')).toBe(true)
  })

  it('sends email when status changes to resolved', () => {
    expect(shouldSendStatusChangeEmail('open', 'resolved')).toBe(true)
  })

  it('sends email when status changes to waiting_for_customer', () => {
    expect(shouldSendStatusChangeEmail('open', 'waiting_for_customer')).toBe(true)
  })

  it('does NOT send email when status is unchanged', () => {
    expect(shouldSendStatusChangeEmail('open', 'open')).toBe(false)
  })

  it('builds correct API payload for status change email', () => {
    const payload = buildStatusChangeEmailPayload('ticket-123', 'resolved', 'open')
    expect(payload.type).toBe('status_change')
    expect(payload.newStatus).toBe('resolved')
    expect(payload.oldStatus).toBe('open')
  })

  it('generates correct email subject for each status', () => {
    expect(getStatusEmailSubject(1001, 'resolved')).toContain('Resolved')
    expect(getStatusEmailSubject(1001, 'waiting_for_customer')).toContain('Waiting')
    expect(getStatusEmailSubject(1001, 'closed')).toContain('Closed')
    expect(getStatusEmailSubject(1001, 'open')).toContain('Open')
  })
})
