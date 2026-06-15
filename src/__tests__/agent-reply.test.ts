import { describe, it, expect } from 'vitest'

// ── Types (mirrors production types)
type TicketStatus = 'new' | 'open' | 'waiting_for_customer' | 'resolved' | 'closed'

interface ReplyPayload {
  ticketId:   string
  senderId:   string
  content:    string
  isInternal: boolean
}

interface Agent {
  id:        string
  full_name: string
  role:      'agent' | 'admin'
}

// ── Business logic functions (mirrors API route logic)

function buildMessageInsert(payload: ReplyPayload) {
  return {
    ticket_id:   payload.ticketId,
    sender_id:   payload.senderId,
    content:     payload.content.trim(),
    is_internal: payload.isInternal,
  }
}

function buildReplyAuditLog(ticketId: string, agent: Agent) {
  return {
    action:      'ticket.message_sent',
    entity_type: 'ticket',
    entity_id:   ticketId,
    new_values:  { sender: agent.full_name, role: agent.role },
  }
}

function shouldUpdateFirstResponse(firstResponseAt: string | null): boolean {
  return firstResponseAt === null
}

/** Customer email should only go out for public (non-internal) agent messages */
function shouldEmailCustomer(isInternal: boolean, senderRole: string): boolean {
  return !isInternal && senderRole !== 'customer'
}

/** When an agent replies, ticket should move from 'new' to 'open' */
function getStatusAfterAgentReply(currentStatus: TicketStatus): TicketStatus {
  if (currentStatus === 'new') return 'open'
  if (currentStatus === 'waiting_for_customer') return 'open'
  return currentStatus
}

/** Validates reply content — must be non-empty and within limits */
function validateReplyContent(content: string): { valid: boolean; error?: string } {
  const trimmed = content.trim()
  if (trimmed.length === 0) return { valid: false, error: 'Reply content cannot be empty' }
  if (trimmed.length > 10000) return { valid: false, error: 'Reply too long (max 10,000 characters)' }
  return { valid: true }
}

/** Determines email template type based on message context */
function getEmailTemplateType(isInternal: boolean, isAgentReply: boolean): string | null {
  if (isInternal) return null        // Internal notes → no email
  if (isAgentReply) return 'agent_reply'
  return 'customer_reply'
}

// ─────────────────────────────────────────────────────────────────────────────
describe('Agent Reply — Message Insert', () => {
  it('builds a valid message insert payload', () => {
    const msg = buildMessageInsert({
      ticketId:   'ticket-abc',
      senderId:   'agent-xyz',
      content:    'Thank you for reaching out. Let me look into this.',
      isInternal: false,
    })
    expect(msg.ticket_id).toBe('ticket-abc')
    expect(msg.sender_id).toBe('agent-xyz')
    expect(msg.is_internal).toBe(false)
    expect(msg.content.length).toBeGreaterThan(0)
  })

  it('trims whitespace from content before inserting', () => {
    const msg = buildMessageInsert({
      ticketId:   'ticket-abc',
      senderId:   'agent-xyz',
      content:    '  Hello, we are looking into your issue.  ',
      isInternal: false,
    })
    expect(msg.content).toBe('Hello, we are looking into your issue.')
  })

  it('sets is_internal = true for internal notes', () => {
    const msg = buildMessageInsert({
      ticketId:   'ticket-abc',
      senderId:   'agent-xyz',
      content:    'This customer has a chargeback history — escalate carefully.',
      isInternal: true,
    })
    expect(msg.is_internal).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('Agent Reply — Content Validation', () => {
  it('rejects empty reply content', () => {
    const result = validateReplyContent('')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/empty/i)
  })

  it('rejects whitespace-only reply content', () => {
    const result = validateReplyContent('   \n\t  ')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/empty/i)
  })

  it('rejects reply content exceeding 10,000 characters', () => {
    const result = validateReplyContent('x'.repeat(10001))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/long/i)
  })

  it('accepts valid reply content', () => {
    const result = validateReplyContent('Thank you for your patience. The issue has been resolved.')
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('accepts reply content at exactly 10,000 characters (boundary)', () => {
    const result = validateReplyContent('a'.repeat(10000))
    expect(result.valid).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('Agent Reply — Audit Log', () => {
  it('builds correct audit log entry for agent reply', () => {
    const agent = { id: 'agent-xyz', full_name: 'Sarah Agent', role: 'agent' as const }
    const log = buildReplyAuditLog('ticket-abc', agent)
    expect(log.action).toBe('ticket.message_sent')
    expect(log.entity_type).toBe('ticket')
    expect(log.entity_id).toBe('ticket-abc')
    expect(log.new_values.role).toBe('agent')
    expect(log.new_values.sender).toBe('Sarah Agent')
  })

  it('builds correct audit log entry for admin reply', () => {
    const admin = { id: 'admin-001', full_name: 'Admin User', role: 'admin' as const }
    const log = buildReplyAuditLog('ticket-xyz', admin)
    expect(log.new_values.role).toBe('admin')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('Agent Reply — First Response Tracking', () => {
  it('marks first_response_at when no prior response exists', () => {
    expect(shouldUpdateFirstResponse(null)).toBe(true)
  })

  it('does NOT overwrite first_response_at if already set', () => {
    expect(shouldUpdateFirstResponse('2024-01-01T10:00:00Z')).toBe(false)
  })

  it('does not overwrite even with very recent timestamp', () => {
    expect(shouldUpdateFirstResponse(new Date().toISOString())).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('Agent Reply — Status Transitions', () => {
  it('moves ticket from "new" to "open" when agent replies', () => {
    expect(getStatusAfterAgentReply('new')).toBe('open')
  })

  it('moves ticket from "waiting_for_customer" to "open" when agent replies', () => {
    expect(getStatusAfterAgentReply('waiting_for_customer')).toBe('open')
  })

  it('keeps "open" status when ticket is already open', () => {
    expect(getStatusAfterAgentReply('open')).toBe('open')
  })

  it('keeps "resolved" status unchanged (agent can still add notes)', () => {
    expect(getStatusAfterAgentReply('resolved')).toBe('resolved')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('Agent Reply — Email Notification Logic', () => {
  it('sends email to customer for public agent reply', () => {
    expect(shouldEmailCustomer(false, 'agent')).toBe(true)
  })

  it('sends email to customer for public admin reply', () => {
    expect(shouldEmailCustomer(false, 'admin')).toBe(true)
  })

  it('does NOT send email for internal notes', () => {
    expect(shouldEmailCustomer(true, 'agent')).toBe(false)
  })

  it('does NOT send email when customer replies (customer sends, not agent)', () => {
    expect(shouldEmailCustomer(false, 'customer')).toBe(false)
  })

  it('returns correct email template type for public agent reply', () => {
    expect(getEmailTemplateType(false, true)).toBe('agent_reply')
  })

  it('returns null template for internal notes (no email)', () => {
    expect(getEmailTemplateType(true, true)).toBeNull()
  })

  it('returns customer_reply template for customer messages', () => {
    expect(getEmailTemplateType(false, false)).toBe('customer_reply')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe('Agent Reply — Canned Response Integration', () => {
  it('substitutes {{customer_name}} placeholder correctly', () => {
    const template = 'Hi {{customer_name}}, thank you for contacting us.'
    const result = template.replace(/\{\{customer_name\}\}/g, 'Ali Raza')
    expect(result).toBe('Hi Ali Raza, thank you for contacting us.')
  })

  it('substitutes {{agent_name}} placeholder correctly', () => {
    const template = 'Best regards, {{agent_name}}'
    const result = template.replace(/\{\{agent_name\}\}/g, 'Sarah Agent')
    expect(result).toBe('Best regards, Sarah Agent')
  })

  it('substitutes multiple placeholders in one template', () => {
    const template = 'Hi {{customer_name}}, this is {{agent_name}} from support.'
    const result = template
      .replace(/\{\{customer_name\}\}/g, 'Bilal')
      .replace(/\{\{agent_name\}\}/g, 'Sarah')
    expect(result).toBe('Hi Bilal, this is Sarah from support.')
  })

  it('replaces all occurrences of same placeholder', () => {
    const template = '{{customer_name}}, your ticket is ready. Thank you {{customer_name}}!'
    const result = template.replace(/\{\{customer_name\}\}/g, 'Ali')
    expect(result).toBe('Ali, your ticket is ready. Thank you Ali!')
  })

  it('leaves unmatched placeholders untouched', () => {
    const template = 'Hi {{customer_name}}, {{unknown_placeholder}} here.'
    const result = template.replace(/\{\{customer_name\}\}/g, 'Ali')
    expect(result).toBe('Hi Ali, {{unknown_placeholder}} here.')
  })
})
