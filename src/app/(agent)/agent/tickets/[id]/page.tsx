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
import { getFlagImageUrl } from '@/lib/countries/api'
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
  return <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><Clock className="h-4 w-4 text-slate-500" /></div>
}

function timelineLabel(entry: AuditEntry): string {
  const nv = entry.new_values ?? {}
  const ov = entry.old_values ?? {}
  if (entry.action === 'ticket.created') return 'Ticket created'
  if (entry.action === 'ticket.status_changed') return `Status: "${String(ov.status ?? '').replace(/_/g, ' ')}" → "${String(nv.status ?? '').replace(/_/g, ' ')}"`
  if (entry.action === 'ticket.assigned') return 'Assigned to agent'
  if (entry.action === 'ticket.sla_breached') return 'SLA deadline breached'
  if (entry.action === 'ticket.auto_closed') return 'Auto-closed after resolution'
  if (entry.action === 'ticket.duplicate_detected') return 'Flagged as possible duplicate'
  if (entry.action === 'ticket.note_added') return 'Internal note added'
  if (entry.action === 'ticket.message_sent') return 'Reply sent to customer'
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string>('Agent')
  const [replyText, setReplyText] = useState('')
  const [noteText, setNoteText] = useState('')
  const [replyFiles, setReplyFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showCanned, setShowCanned] = useState(false)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setCurrentUserId(user.id)

    // All data via API routes (service role — bypasses RLS)
    const [ticketRes, msgRes, noteRes, attRes, auditRes, emailLogRes, resourcesRes] = await Promise.all([
      fetch(`/api/tickets/${id}`),
      fetch(`/api/tickets/${id}/messages`),
      fetch(`/api/tickets/${id}/notes`),
      fetch(`/api/tickets/${id}/attachments`),
      fetch(`/api/tickets/${id}/audit`),
      fetch(`/api/tickets/${id}/email-logs`),
      fetch('/api/agent/resources'),
    ])

    if (!ticketRes.ok) { router.push('/agent/queue'); return }

    const ticketData = await ticketRes.json() as Ticket & { category?: { name: string; color: string }; customer?: UserProfile }
    setTicket(ticketData)

    if (msgRes.ok) setMessages(await msgRes.json())
    if (noteRes.ok) setNotes(await noteRes.json())
    if (attRes.ok) setAttachments(await attRes.json())
    if (auditRes.ok) setTimeline(await auditRes.json())
    if (emailLogRes.ok) setEmailLogs(await emailLogRes.json())
    if (resourcesRes.ok) {
      const r = await resourcesRes.json()
      setAgents(r.agents ?? [])
      setCannedResponses(r.cannedResponses ?? [])
      const me = (r.agents ?? []).find((a: UserProfile) => a.id === user.id)
      if (me) setCurrentUserName(me.full_name)
    }

    setLoading(false)

    // Background: SLA + country
    if (ticketData.priority) {
      fetch(`/api/sla?priority=${ticketData.priority}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setSlaRule(d) })
        .catch(() => null)
    }
    if (ticketData.country_code) {
      fetch(`/api/countries/${ticketData.country_code}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setCountryInfo(d) })
        .catch(() => null)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const applyCanned = (r: CannedResponse) => {
    const filled = r.content
      .replace(/\{\{customer_name\}\}/g, ticket?.customer?.full_name ?? 'Customer')
      .replace(/\{\{agent_name\}\}/g, currentUserName)
    setReplyText(filled)
    setShowCanned(false)
  }

  const sendReply = async () => {
    if (!replyText.trim() || !ticket || !currentUserId) return
    setSending(true)

    // Use API route — it handles email notification + audit log + first_response_at internally
    const res = await fetch(`/api/tickets/${ticket.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: replyText, is_internal: false }),
    })

    if (!res.ok) { toast.error('Failed to send reply'); setSending(false); return }
    const message = await res.json() as TicketMessage & { sender?: UserProfile }

    // Upload attachments via storage (directly, storage bucket has permissive upload policy)
    for (const file of replyFiles) {
      const path = `tickets/${ticket.id}/${Date.now()}-${file.name}`
      const { data: up } = await supabase.storage.from('attachments').upload(path, file)
      if (up) {
        const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(up.path)
        await fetch(`/api/tickets/${ticket.id}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message_id: message.id, file_name: file.name, file_url: publicUrl, file_size: file.size, mime_type: file.type }),
        })
      }
    }

    setMessages(prev => [...prev, message])
    // Update local ticket state if API changed first_response_at / status
    if (!ticket.first_response_at) {
      setTicket(prev => prev ? { ...prev, first_response_at: new Date().toISOString(), status: 'open' } : prev)
    }
    setReplyText('')
    setReplyFiles([])
    setSending(false)
    toast.success('Reply sent!')
  }

  const addNote = async () => {
    if (!noteText.trim() || !ticket) return
    setAddingNote(true)

    const res = await fetch(`/api/tickets/${ticket.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: noteText }),
    })

    if (!res.ok) { toast.error('Failed to add note'); setAddingNote(false); return }
    const note = await res.json() as TicketInternalNote & { author?: UserProfile }
    setNotes(prev => [...prev, note])
    setNoteText('')
    setAddingNote(false)
    toast.success('Note added!')
  }

  const changeStatus = async (newStatus: string) => {
    if (!ticket) return
    const oldStatus = ticket.status

    // PATCH route handles email + audit log
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) { toast.error('Failed to update status'); return }

    setTicket(prev => prev ? { ...prev, status: newStatus as Ticket['status'] } : prev)
    setTimeline(prev => [...prev, {
      id: crypto.randomUUID(),
      action: 'ticket.status_changed',
      entity_type: 'ticket',
      entity_id: ticket.id,
      old_values: { status: oldStatus },
      new_values: { status: newStatus },
      created_at: new Date().toISOString(),
    }])
    toast.success(`Status → ${newStatus.replace(/_/g, ' ')}`)
  }

  const assignTicket = async (agentId: string) => {
    if (!ticket || !currentUserId) return

    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_agent_id: agentId, status: 'open' }),
    })
    if (!res.ok) { toast.error('Failed to assign ticket'); return }

    // Also log the assignment
    await fetch(`/api/tickets/${ticket.id}/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ticket.assigned',
        old_values: { agent_id: ticket.assigned_agent_id },
        new_values: { agent_id: agentId },
      }),
    })

    const agent = agents.find(a => a.id === agentId)
    setTicket(prev => prev ? { ...prev, assigned_agent_id: agentId, status: 'open' } : prev)
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
                <Send className="h-4 w-4" /> Conversation ({messages.length})
              </TabsTrigger>
              <TabsTrigger value="notes">
                <StickyNote className="h-4 w-4" /> Notes ({notes.length})
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <History className="h-4 w-4" /> Timeline ({timeline.length})
              </TabsTrigger>
              <TabsTrigger value="emails">
                <Mail className="h-4 w-4" /> Emails ({emailLogs.length})
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
                                  <button key={r.id} onClick={() => applyCanned(r)} className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors">
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
                <span className="text-slate-700 font-medium">{ticket.customer?.full_name ?? '—'}</span>
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
              {ticket.assigned_agent_id && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned To</span>
                  <span className="text-slate-700 text-xs">
                    {agents.find(a => a.id === ticket.assigned_agent_id)?.full_name ?? '—'}
                  </span>
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
                  <Globe className="h-4 w-4" /> Customer Country
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <img src={getFlagImageUrl(countryInfo.country_code)} alt={countryInfo.name} width={28} height={21} className="rounded-sm" />
                  <span className="font-medium">{countryInfo.name}</span>
                </div>
                {countryInfo.currency_code && <div className="flex justify-between"><span className="text-slate-500">Currency</span><span>{countryInfo.currency_code} — {countryInfo.currency_name}</span></div>}
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

          <div>
            <Link href={`/agent/assigned`}>
              <Button variant="outline" size="sm" className="w-full">
                <UserPlus className="h-4 w-4" /> Back to Assigned
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
