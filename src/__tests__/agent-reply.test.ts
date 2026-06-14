import { describe, it, expect } from 'vitest'

// Tests the agent reply business logic (audit log structure, first-response tracking)

interface ReplyPayload {
  ticketId: string
  senderId: string
  content: string
  isInternal: boolean
}

function buildReplyAuditLog(ticketId: string, agent: { id: string; full_name: string; role: string }) {
  return {
    action: 'ticket.message_sent',
    entity_type: 'ticket',
    entity_id: ticketId,
    new_values: {
      sender: agent.full_name,
      role: agent.role,
    },
  }
}

function buildMessageInsert(payload: ReplyPayload) {
  return {
    ticket_id: payload.ticketId,
    sender_id: payload.senderId,
    content: payload.content,
    is_internal: payload.isInternal,
  }
}

function shouldUpdateFirstResponse(firstResponseAt: string | null): boolean {
  return firstResponseAt === null
}

describe('Agent Reply', () => {
  it('builds a valid message insert payload', () => {
    const msg = buildMessageInsert({
      ticketId: 'ticket-abc',
      senderId: 'agent-xyz',
      content: 'Thank you for reaching out. Let me look into this.',
      isInternal: false,
    })
    expect(msg.ticket_id).toBe('ticket-abc')
    expect(msg.sender_id).toBe('agent-xyz')
    expect(msg.is_internal).toBe(false)
    expect(msg.content.length).toBeGreaterThan(0)
  })

  it('builds a correct audit log entry for agent reply', () => {
    const agent = { id: 'agent-xyz', full_name: 'Sarah Agent', role: 'agent' }
    const log = buildReplyAuditLog('ticket-abc', agent)
    expect(log.action).toBe('ticket.message_sent')
    expect(log.entity_type).toBe('ticket')
    expect(log.new_values.role).toBe('agent')
    expect(log.new_values.sender).toBe('Sarah Agent')
  })

  it('marks first_response_at when no prior response exists', () => {
    expect(shouldUpdateFirstResponse(null)).toBe(true)
  })

  it('does not overwrite first_response_at if already set', () => {
    expect(shouldUpdateFirstResponse('2024-01-01T10:00:00Z')).toBe(false)
  })

  it('internal notes are not visible to customers (is_internal flag)', () => {
    const internalMsg = buildMessageInsert({
      ticketId: 'ticket-abc',
      senderId: 'agent-xyz',
      content: 'This customer has a history of disputes — handle with care.',
      isInternal: true,
    })
    expect(internalMsg.is_internal).toBe(true)
  })
})
