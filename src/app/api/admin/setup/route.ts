import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseAdminToken } from '@/lib/admin-auth'

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token || !parseAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()

  // Seed ticket categories
  const categories = [
    { name: 'Technical Support', description: 'Technical issues and bugs', color: '#3B82F6', is_active: true },
    { name: 'Billing', description: 'Payment and subscription issues', color: '#10B981', is_active: true },
    { name: 'General Inquiry', description: 'General questions', color: '#8B5CF6', is_active: true },
    { name: 'Account', description: 'Account access and settings', color: '#F59E0B', is_active: true },
    { name: 'Feature Request', description: 'New feature suggestions', color: '#EC4899', is_active: true },
    { name: 'Bug Report', description: 'Application bugs and errors', color: '#EF4444', is_active: true },
  ]

  const { data: existingCats } = await db.from('ticket_categories').select('id').limit(1)
  if (!existingCats || existingCats.length === 0) {
    await db.from('ticket_categories').insert(categories)
  }

  // Seed SLA rules
  const slaRules = [
    { priority: 'critical', response_hours: 1, resolution_hours: 8, warning_threshold: 80, is_active: true },
    { priority: 'high', response_hours: 4, resolution_hours: 24, warning_threshold: 80, is_active: true },
    { priority: 'medium', response_hours: 8, resolution_hours: 48, warning_threshold: 80, is_active: true },
    { priority: 'low', response_hours: 24, resolution_hours: 72, warning_threshold: 80, is_active: true },
  ]

  const { data: existingRules } = await db.from('sla_rules').select('id').limit(1)
  if (!existingRules || existingRules.length === 0) {
    await db.from('sla_rules').insert(slaRules)
  }

  // Seed canned responses
  const cannedResponses = [
    { title: 'Greeting', content: 'Hello {{customer_name}},\n\nThank you for reaching out to us. I am {{agent_name}} and I will be assisting you today.\n\nBest regards,\n{{agent_name}}', category: 'general', is_active: true },
    { title: 'Issue Resolved', content: 'Hello {{customer_name}},\n\nI am happy to inform you that your issue has been resolved. Please let us know if you experience any further problems.\n\nBest regards,\n{{agent_name}}', category: 'resolution', is_active: true },
    { title: 'Need More Information', content: 'Hello {{customer_name}},\n\nThank you for contacting us. To better assist you, could you please provide more details about the issue you are experiencing?\n\nBest regards,\n{{agent_name}}', category: 'follow-up', is_active: true },
    { title: 'Escalation Notice', content: 'Hello {{customer_name}},\n\nI have escalated your issue to our specialized team. You will be contacted within 24 hours.\n\nBest regards,\n{{agent_name}}', category: 'escalation', is_active: true },
    { title: 'Billing Inquiry Response', content: 'Hello {{customer_name}},\n\nThank you for your billing inquiry. Our billing team will review your account and respond within 1 business day.\n\nBest regards,\n{{agent_name}}', category: 'billing', is_active: true },
  ]

  const { data: existingCanned } = await db.from('canned_responses').select('id').limit(1)
  if (!existingCanned || existingCanned.length === 0) {
    await db.from('canned_responses').insert(cannedResponses)
  }

  return NextResponse.json({
    success: true,
    message: 'Platform setup complete — categories, SLA rules, and canned responses created.',
  })
}
