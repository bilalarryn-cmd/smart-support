'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Send, StickyNote, UserPlus, Globe, Mail, History, ArrowLeft, Paperclip, X, MessageSquare, Clock, CheckCircle, AlertTriangle, UserCheck, Tag, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TicketStatusBadge, TicketPriorityBadge } from '@/components/shared/ticket-status-badge'
import { SlaIndicator } from '@/components/shared/sla-indicator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PageLoader } from '@/components/shared/loading-spinner'
import { formatDateTime, formatRelativeTime, getInitials, formatFileSize, getMimeIcon } from '@/lib/utils'
import type { Ticket, TicketMessage, TicketInternalNote, TicketAttachment, UserProfile, SlaRule, CountryInfo, EmailLog } from '@/types'
import Link from 'next/link'

const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'open', label: 'Open' },
  { value: 'waiting_for_customer', label: 'Waiting for Customer' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

interface AuditEntry {
  id: string
  action: string
  entity_type: string
  entity_id: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  created_at: string
  user?: { full_name: string; role: string } | null
}

interface CannedResponse {
  id: string
  title: string
  content: string
  category: string
}

function timelineIcon(action: string) {
  if (action.includes('created')) return <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><CheckCircle className="h-4 w-4 text-blue-600" /></div>
  if (action.includes('status')) return <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center"><Tag className="h-4 w-4 text-purple-600" /></div>
  if (action.includes('assign')) return <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"><UserCheck className="h-4 w-4 text-emerald-600" /></div>
  if (action.includes('sla')) return <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-red-600" /></div>
  if (action.includes('closed') || action.includes('resolved')) return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><CheckCircle className="h-4 w-4 text-slate-500" /></div>
  return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><Clock className="h-4 w-4 text-slate-500" /></div>
}

function timelineLabel(entry: AuditEntry): string {
  const nv = entry.new_values ?? {}
  const ov = entry.old_values ?? {}
  if (entry.action === 'ticket.created') return 'Ticket created'
  if (entry.action === 'ticket.status_changed') return `Status changed from "${String(ov.status ?? '').replace(/_/g, ' ')}" to "${String(nv.status ?? '').replace(/_/g, ' ')}"`
  if (entry.action === 'ticket.assigned') return `Assigned to agent`
  if (entry.action === 'ticket.sla_breached') return 'SLA deadline breached'
  if (entry.action === 'ticket.auto_closed') return 'Ticket auto-closed after resolution'
  if (entry.action === 'ticket.duplicate_detected') return 'Flagged as possible duplicate'
  if (entry.action === 'ticket.closed') return 'Ticket closed'
  if (entry.action === 'ticket.resolved') return 'Ticket resolved'
  return entry.action.replace('ticket.', '').replace(/_/g, ' ')
}

export default function AgentTicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [ticket, setTicket] = useState<Ticket & { category?: { name: string; color: string }; customer?: UserProfile } | null>(null)
  const [messages, setMessages] = useState<(TicketMessage & { sender?: UserProfile })[]>([])
  const [notes, setNotes] = useState<(TicketInternalNote & { author?: UserProfile })[]>([])
  const [attachments, setAttachments] = useState<TicketAttachment[]>([])
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [timeline, setTimeline] = useState<AuditEntry[]>([])
  const [slaRule, setSlaRule] = useState<SlaRule | null>(null)
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null)
  const [agents, setAgents] = useState<UserProfile[]>([])
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([])
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [replyText, setReplyText] = useState('')
  const [noteText, setNoteText] = useState('')
  const [replyFiles, setReplyFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showCanned, setShowCanned] = useState(false)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, ticketRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', user.id).single(),
      supabase.from('tickets').select('*, category:ticket_categories(name, color), customer:user_profiles!customer_id(*)').eq('id', id).single(),
    ])

    if (!ticketRes.data) { router.push('/agent/queue'); return }

    setCurrentUser(profileRes.data as UserProfile)
    setTicket(ticketRes.data as Ticket & { category?: { name: string; color: string }; customer?: UserProfile })

    const [msgRes, noteRes, attRes, slaRes, emailRes, agentsRes, timelineRes, cannedRes] = await Promise.all([
      supabase.from('ticket_messages').select('*, sender:user_profiles(*)').eq('ticket_id', id).order('created_at'),
      supabase.from('ticket_internal_notes').select('*, author:user_profiles(*)').eq('ticket_id', id).order('created_at'),
      supabase.from('ticket_attachments').select('*').eq('ticket_id', id).order('created_at'),
      supabase.from('sla_rules').select('*').eq('priority', ticketRes.data.priority).eq('is_active', true).single(),
      supabase.from('email_logs').select('*').eq('ticket_id', id).order('sent_at', { ascending: false }),
      supabase.from('user_profiles').select('*').eq('role', 'agent').eq('is_active', true),
      supabase.from('audit_logs').select('*').eq('entity_type', 'ticket').eq('entity_id', id).order('created_at'),
      supabase.from('canned_responses').select('id, title, content, category').eq('is_active', true).order('category').order('title'),
    ])

    setMessages((msgRes.data ?? []) as (TicketMessage & { sender?: UserProfile })[])
    setNotes((noteRes.data ?? []) as (TicketInternalNote & { author?: UserProfile })[])
    setAttachments((attRes.data ?? []) as TicketAttachment[])
    setSlaRule(slaRes.data as SlaRule | null)
    setEmailLogs((emailRes.data ?? []) as EmailLog[])
    setAgents((agentsRes.data ?? []) as UserProfile[])
    setTimeline((timelineRes.data ?? []) as AuditEntry[])
    setCannedResponses((cannedRes.data ?? []) as CannedResponse[])

    if (ticketRes.data.country_code) {
      const { data: country } = await supabase.from('country_info_cache').select('*').eq('country_code', ticketRes.data.country_code).single()
      setCountryInfo(country as CountryInfo | null)
    }

    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const applyCanned = (r: CannedResponse) => {
    const filled = r.content
      .replace(/\{\{customer_name\}\}/g, ticket?.customer?.full_name ?? 'Customer')
      .replace(/\{\{agent_name\}\}/g, currentUser?.full_name ?? 'Support Team')
    setReplyText(filled)
    setShowCanned(false)
  }

  const sendReply = async () => {
    if (!replyText.trim() || !ticket || !currentUser) return
    setSending(true)

    const { data: message, error } = await supabase.from('ticket_messages').insert({
      ticket_id: ticket.id,
      sender_id: currentUser.id,
      content: replyText,
      is_internal: false,
    }).select('*, sender:user_profiles(*)').single()

    if (error) { toast.error('Failed to send reply'); setSending(false); return }

    if (!ticket.first_response_at) {
      await supabase.from('tickets').update({ first_response_at: new Date().toISOString(), status: 'open' }).eq('id', ticket.id)
      setTicket(prev => prev ? { ...prev, first_response_at: new Date().toISOString(), status: 'open' } : prev)
    }

    for (const file of replyFiles) {
      const path = `tickets/${ticket.id}/${Date.now()}-${file.name}`
      const { data: up } = await supabase.storage.from('attachments').upload(path, file)
      if (up) {
        const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(up.path)
        await supabase.from('ticket_attachments').insert({
          ticket_id: ticket.id, message_id: message.id, uploaded_by: currentUser.id,
          file_name: file.name, file_url: publicUrl, file_size: file.size, mime_type: file.type,
        })
      }
    }

    // Audit
    await supabase.from('audit_logs').insert({
      user_id: currentUser.id,
      action: 'ticket.message_sent',
      entity_type: 'ticket',
      entity_id: ticket.id,
      new_values: { sender: currentUser.full_name, role: currentUser.role },
    })

    setMessages(prev => [...prev, message as TicketMessage & { sender?: UserProfile }])
    setReplyText('')
    setReplyFiles([])
    setSending(false)
    toast.success('Reply sent!')

    await fetch('/api/tickets/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: ticket.id, type: 'agent_reply', content: replyText, agentName: currentUser.full_name }),
    }).catch(() => null)
  }

  const addNote = async () => {
    if (!noteText.trim() || !ticket || !currentUser) return
    setAddingNote(true)

    const { data: note, error } = await supabase.from('ticket_internal_notes').insert({
      ticket_id: ticket.id,
      author_id: currentUser.id,
      content: noteText,
    }).select('*, author:user_profiles(*)').single()

    if (error) { toast.error('Failed to add note'); setAddingNote(false); return }

    setNotes(prev => [...prev, note as TicketInternalNote & { author?: UserProfile }])
    setNoteText('')
    setAddingNote(false)
    toast.success('Note added!')
  }

  const changeStatus = async (newStatus: string) => {
    if (!ticket || !currentUser) return
    const updates: Partial<Ticket> = { status: newStatus as Ticket['status'] }
    if (newStatus === 'resolved') updates.resolved_at = new Date().toISOString()
    if (newStatus === 'closed') updates.closed_at = new Date().toISOString()

    await supabase.from('tickets').update(updates).eq('id', ticket.id)
    await supabase.from('audit_logs').insert({
      user_id: currentUser.id,
      action: 'ticket.status_changed',
      entity_type: 'ticket',
      entity_id: ticket.id,
      old_values: { status: ticket.status },
      new_values: { status: newStatus },
    })

    setTicket(prev => prev ? { ...prev, ...updates } : prev)
    setTimeline(prev => [...prev, {
      id: crypto.randomUUID(),
      action: 'ticket.status_changed',
      entity_type: 'ticket',
      entity_id: ticket.id,
      old_values: { status: ticket.status },
      new_values: { status: newStatus },
      created_at: new Date().toISOString(),
    }])
    toast.success(`Status changed to ${newStatus.replace(/_/g, ' ')}`)

    await fetch('/api/tickets/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: ticket.id, type: 'status_change', newStatus, oldStatus: ticket.status }),
    }).catch(() => null)
  }

  const assignTicket = async (agentId: string) => {
    if (!ticket || !currentUser) return
    await supabase.from('tickets').update({ assigned_agent_id: agentId, status: 'open' }).eq('id', ticket.id)
    await supabase.from('ticket_assignments').insert({
      ticket_id: ticket.id,
      assigned_from: ticket.assigned_agent_id,
      assigned_to: agentId,
      assigned_by: currentUser.id,
    })
    await supabase.from('audit_logs').insert({
      user_id: currentUser.id,
      action: 'ticket.assigned',
      entity_type: 'ticket',
      entity_id: ticket.id,
      old_values: { agent_id: ticket.assigned_agent_id },
      new_values: { agent_id: agentId },
    })

    const agent = agents.find(a => a.id === agentId)
    setTicket(prev => prev ? { ...prev, assigned_agent_id: agentId } : prev)
    toast.success(`Assigned to ${agent?.full_name ?? 'agent'}`)
  }

  if (loading) return <PageLoader />
  if (!ticket) return null

  const cannedByCategory: Record<string, CannedResponse[]> = {}
  cannedResponses.forEach(r => { cannedByCategory[r.category] = [...(cannedByCategory[r.category] ?? []), r] })

  return (
    <div className="animate-slide-in max-w-6xl mx-auto">
      <div className="mb-4">
        <Link href="/agent/assigned">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> Back</Button>
        </Link>
      </div>

      <PageHeader title={`#${ticket.ticket_number}: ${ticket.subject}`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="conversation">
            <TabsList className="mb-4">
              <TabsTrigger value="conversation">
                <Send className="h-4 w-4" />
                Conversation ({messages.length})
              </TabsTrigger>
              <TabsTrigger value="notes">
                <StickyNote className="h-4 w-4" />
                Notes ({notes.length})
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <History className="h-4 w-4" />
                Timeline ({timeline.length})
              </TabsTrigger>
              <TabsTrigger value="emails">
                <Mail className="h-4 w-4" />
                Emails
              </TabsTrigger>
            </TabsList>

            {/* CONVERSATION */}
            <TabsContent value="conversation">
              <Card>
                <CardContent className="pt-6">
                  {/* Original */}
                  <div className="flex gap-3 pb-5 mb-5 border-b border-slate-100">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback>{getInitials(ticket.customer?.full_name ?? 'C')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold">{ticket.customer?.full_name ?? 'Customer'}</span>
                        <span className="text-xs text-slate-400">{formatDateTime(ticket.created_at)}</span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Original</span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap">{ticket.description}</div>
                    </div>
                  </div>

                  <div className="space-y-5 mb-6">
                    {messages.map(msg => {
                      const isAgent = msg.sender?.role !== 'customer'
                      return (
                        <div key={msg.id} className={`flex gap-3 ${isAgent ? 'flex-row-reverse' : ''}`}>
                          <Avatar className="h-8 w-8 shrink-0">
                            {msg.sender?.avatar_url && <AvatarImage src={msg.sender.avatar_url} />}
                            <AvatarFallback>{getInitials(msg.sender?.full_name ?? '?')}</AvatarFallback>
                          </Avatar>
                          <div className={`flex-1 flex flex-col ${isAgent ? 'items-end' : ''}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold">{msg.sender?.full_name}</span>
                              <span className="text-xs text-slate-400 capitalize">{msg.sender?.role}</span>
                              <span className="text-xs text-slate-400">{formatRelativeTime(msg.created_at)}</span>
                            </div>
                            <div className={`rounded-xl p-4 text-sm max-w-[85%] whitespace-pre-wrap ${isAgent ? 'bg-blue-600 text-white' : 'bg-slate-50 border border-slate-100 text-slate-700'}`}>
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Reply box */}
                  <div className="pt-4 border-t border-slate-100">
                    {/* Canned responses picker */}
                    <div className="relative mb-3">
                      <button
                        type="button"
                        onClick={() => setShowCanned(p => !p)}
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Canned responses
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showCanned ? 'rotate-180' : ''}`} />
                      </button>

                      {showCanned && (
                        <div className="absolute top-full left-0 z-20 mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
                          {cannedResponses.length === 0 ? (
                            <p className="text-xs text-slate-400 p-4 text-center">No canned responses yet</p>
                          ) : (
                            Object.entries(cannedByCategory).map(([cat, items]) => (
                              <div key={cat}>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-3 pb-1 capitalize">{cat}</p>
                                {items.map(r => (
                                  <button
                                    key={r.id}
                                    onClick={() => applyCanned(r)}
                                    className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors"
                                  >
                                    <p className="text-sm font-medium text-slate-800">{r.title}</p>
                                    <p className="text-xs text-slate-400 truncate mt-0.5">{r.content.split('\n')[0]}</p>
                                  </button>
                                ))}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <Textarea placeholder="Write a reply to the customer..." rows={4} value={replyText} onChange={e => setReplyText(e.target.value)} />
                    {replyFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {replyFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                            <span>{getMimeIcon(f.type)}</span>
                            <span className="flex-1 truncate">{f.name}</span>
                            <button onClick={() => setReplyFiles(prev => prev.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <label className="cursor-pointer p-2 rounded-lg hover:bg-slate-100 text-slate-500">
                        <Paperclip className="h-4 w-4" />
                        <input type="file" multiple className="hidden" onChange={e => setReplyFiles(Array.from(e.target.files ?? []))} accept="image/*,.pdf,.doc,.docx,.txt" />
                      </label>
                      <div className="flex-1" />
                      <Button onClick={sendReply} loading={sending} disabled={!replyText.trim()}>
                        <Send className="h-4 w-4" /> Send Reply
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* INTERNAL NOTES */}
            <TabsContent value="notes">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4 mb-6">
                    {notes.length === 0 ? (
                      <p className="text-center text-slate-400 text-sm py-8">No internal notes yet</p>
                    ) : (
                      notes.map(note => (
                        <div key={note.id} className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">{getInitials(note.author?.full_name ?? '?')}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-semibold text-slate-800">{note.author?.full_name}</span>
                            <span className="text-xs text-slate-400">{formatRelativeTime(note.created_at)}</span>
                            <span className="text-xs bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full ml-auto">Internal</span>
                          </div>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <Textarea placeholder="Add an internal note (not visible to customer)..." rows={3} value={noteText} onChange={e => setNoteText(e.target.value)} className="border-amber-200 focus:ring-amber-400" />
                    <div className="flex justify-end mt-3">
                      <Button onClick={addNote} loading={addingNote} disabled={!noteText.trim()} variant="secondary">
                        <StickyNote className="h-4 w-4" /> Add Note
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ACTIVITY TIMELINE */}
            <TabsContent value="timeline">
              <Card>
                <CardContent className="pt-6">
                  {timeline.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-8">No activity recorded yet</p>
                  ) : (
                    <div className="relative">
                      {/* Vertical line */}
                      <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-100" />
                      <div className="space-y-6">
                        {timeline.map((entry, i) => (
                          <div key={entry.id ?? i} className="flex gap-4 relative">
                            <div className="shrink-0 z-10">{timelineIcon(entry.action)}</div>
                            <div className="flex-1 pt-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800">{timelineLabel(entry)}</p>
                              {entry.user?.full_name && (
                                <p className="text-xs text-slate-500 mt-0.5">by {entry.user.full_name} <span className="capitalize">({entry.user.role})</span></p>
                              )}
                              <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(entry.created_at)}</p>
                              {entry.new_values && Object.keys(entry.new_values).length > 0 && (
                                <div className="mt-2 bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-500 font-mono">
                                  {Object.entries(entry.new_values).map(([k, v]) => (
                                    <div key={k}><span className="text-slate-400">{k}:</span> {String(v)}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* EMAIL HISTORY */}
            <TabsContent value="emails">
              <Card>
                <CardContent className="pt-6">
                  {emailLogs.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-8">No emails sent for this ticket</p>
                  ) : (
                    <div className="space-y-3">
                      {emailLogs.map(log => (
                        <div key={log.id} className="flex items-start gap-3 p-4 rounded-xl border border-slate-100">
                          <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${log.status === 'sent' ? 'bg-emerald-500' : log.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">{log.subject}</p>
                            <p className="text-xs text-slate-500 mt-0.5">To: {log.recipient_email}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-slate-400">{formatDateTime(log.sent_at)}</span>
                              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{log.template_type.replace(/_/g, ' ')}</span>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${log.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : log.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {log.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
                <Select value={ticket.status} onValueChange={changeStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assign To</label>
                <Select value={ticket.assigned_agent_id ?? ''} onValueChange={assignTicket}>
                  <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                  <SelectContent>
                    {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Ticket Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status</span>
                <TicketStatusBadge status={ticket.status} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Priority</span>
                <TicketPriorityBadge priority={ticket.priority} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer</span>
                <span className="text-slate-700 font-medium">{ticket.customer?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Created</span>
                <span className="text-slate-700 text-xs">{formatDateTime(ticket.created_at)}</span>
              </div>
              {ticket.first_response_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">First Response</span>
                  <span className="text-slate-700 text-xs">{formatRelativeTime(ticket.first_response_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {slaRule && (
            <Card>
              <CardHeader><CardTitle>SLA</CardTitle></CardHeader>
              <CardContent>
                <SlaIndicator ticket={ticket} slaRule={slaRule} />
              </CardContent>
            </Card>
          )}

          {countryInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Customer Country
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{countryInfo.flag_emoji}</span>
                  <span className="font-medium">{countryInfo.name}</span>
                </div>
                {countryInfo.currency_code && <div className="flex justify-between"><span className="text-slate-500">Currency</span><span>{countryInfo.currency_code}</span></div>}
                {countryInfo.calling_code && <div className="flex justify-between"><span className="text-slate-500">Phone</span><span>{countryInfo.calling_code}</span></div>}
                {countryInfo.language && <div className="flex justify-between"><span className="text-slate-500">Language</span><span>{countryInfo.language}</span></div>}
                {countryInfo.region && <div className="flex justify-between"><span className="text-slate-500">Region</span><span>{countryInfo.region}</span></div>}
              </CardContent>
            </Card>
          )}

          {attachments.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Attachments ({attachments.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {attachments.map(att => (
                  <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50 transition-colors group">
                    <span className="text-lg">{getMimeIcon(att.mime_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 group-hover:text-blue-600 truncate">{att.file_name}</p>
                      <p className="text-xs text-slate-400">{formatFileSize(att.file_size)}</p>
                    </div>
                  </a>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
