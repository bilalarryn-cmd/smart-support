export type UserRole = 'customer' | 'agent' | 'admin'
export type TicketStatus = 'new' | 'open' | 'waiting_for_customer' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high'
export type EmailStatus = 'sent' | 'failed' | 'bounced'
export type AutomationStatus = 'running' | 'completed' | 'failed'

export interface UserProfile {
  id: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  phone: string | null
  country_code: string
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TicketCategory {
  id: string
  name: string
  description: string | null
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SlaRule {
  id: string
  priority: TicketPriority
  response_hours: number
  resolution_hours: number
  warning_threshold: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  ticket_number: number
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  category_id: string | null
  customer_id: string
  assigned_agent_id: string | null
  country_code: string
  sla_due_at: string | null
  sla_warned: boolean
  sla_breached: boolean
  first_response_at: string | null
  resolved_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  category?: TicketCategory
  customer?: UserProfile
  assigned_agent?: UserProfile
}

export interface TicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  content: string
  is_internal: boolean
  created_at: string
  sender?: UserProfile
}

export interface TicketInternalNote {
  id: string
  ticket_id: string
  author_id: string
  content: string
  created_at: string
  updated_at: string
  author?: UserProfile
}

export interface TicketAttachment {
  id: string
  ticket_id: string
  message_id: string | null
  uploaded_by: string
  file_name: string
  file_url: string
  file_size: number
  mime_type: string
  created_at: string
  uploader?: UserProfile
}

export interface TicketAssignment {
  id: string
  ticket_id: string
  assigned_from: string | null
  assigned_to: string
  assigned_by: string
  created_at: string
  assignee?: UserProfile
  assigner?: UserProfile
}

export interface CountryInfo {
  country_code: string
  name: string
  flag_emoji: string | null
  flag_url: string | null
  currency_code: string | null
  currency_name: string | null
  calling_code: string | null
  region: string | null
  subregion: string | null
  language: string | null
  cached_at: string
}

export interface EmailLog {
  id: string
  ticket_id: string | null
  recipient_email: string
  recipient_name: string | null
  subject: string
  template_type: string
  status: EmailStatus
  resend_message_id: string | null
  error_message: string | null
  sent_at: string
  created_at: string
  ticket?: Ticket
}

export interface AutomationJob {
  id: string
  job_type: string
  status: AutomationStatus
  tickets_processed: number
  actions_taken: number
  error_message: string | null
  started_at: string
  completed_at: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
  user?: UserProfile
}

export interface SlaStatus {
  percentage: number
  risk: 'safe' | 'warning' | 'breached'
  dueAt: Date | null
  hoursRemaining: number | null
  label: string
}

export interface AnalyticsData {
  totalTickets: number
  openTickets: number
  closedTickets: number
  resolvedTickets: number
  highPriorityTickets: number
  slaBreaches: number
  avgResponseTimeHours: number
  ticketsByStatus: { status: string; count: number }[]
  ticketsByPriority: { priority: string; count: number }[]
  ticketsByCategory: { category: string; count: number }[]
  agentPerformance: {
    agent_id: string
    agent_name: string
    assigned: number
    resolved: number
    avg_response_hours: number
  }[]
  emailStats: {
    total: number
    sent: number
    failed: number
    bounced: number
  }
  ticketsOverTime: { date: string; count: number }[]
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiError {
  error: string
  details?: string
}
