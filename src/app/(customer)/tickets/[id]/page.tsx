'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Send, Paperclip, X, ArrowLeft, XCircle, Globe, Edit2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { TicketStatusBadge, TicketPriorityBadge } from '@/components/shared/ticket-status-badge'
import { SlaIndicator } from '@/components/shared/sla-indicator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PageLoader } from '@/components/shared/loading-spinner'
import { formatDateTime, formatRelativeTime, getInitials, formatFileSize, getMimeIcon } from '@/lib/utils'
import { COMMON_COUNTRIES } from '@/lib/countries/api'
import type { Ticket, TicketMessage, TicketAttachment, UserProfile, SlaRule, CountryInfo } from '@/types'
import Link from 'next/link'

export default function CustomerTicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [ticket, setTicket] = useState<Ticket & { category?: { name: string; color: string } } | null>(null)
  const [messages, setMessages] = useState<(TicketMessage & { sender?: UserProfile })[]>([])
  const [attachments, setAttachments] = useState<TicketAttachment[]>([])
  const [slaRule, setSlaRule] = useState<SlaRule | null>(null)
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: string; full_name?: string; avatar_url?: string } | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyFiles, setReplyFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [editSubject, setEditSubject] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [savingEdit, setSavingEdit] = useState(false)

  const loadTicket = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    setCurrentUser({ id: user.id, full_name: user.user_metadata?.full_name, avatar_url: user.user_metadata?.avatar_url })

    // Use API endpoint (uses createAdminClient — bypasses RLS)
    const [ticketRes, msgRes, attRes] = await Promise.all([
      fetch(`/api/tickets/${id}`),
      fetch(`/api/tickets/${id}/messages`),
      fetch(`/api/tickets/${id}/attachments`),
    ])

    if (!ticketRes.ok) { router.push('/tickets'); return }

    const ticketData = await ticketRes.json()
    // Security: only show customer's own ticket
    if (ticketData.customer_id !== user.id) { router.push('/tickets'); return }

    setTicket(ticketData)

    if (msgRes.ok) {
      const msgData = await msgRes.json()
      setMessages(msgData ?? [])
    }

    if (attRes.ok) {
      const attData = await attRes.json()
      setAttachments(attData ?? [])
    }

    // Show page immediately — don't block on slow external APIs
    setLoading(false)

    // SLA rule (background)
    fetch(`/api/sla?priority=${ticketData.priority}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSlaRule(d) })
      .catch(() => null)

    // Country info (background — external API can be slow)
    if (ticketData.country_code) {
      fetch(`/api/countries/${ticketData.country_code}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setCountryInfo(d) })
        .catch(() => null)
    }
  }, [id])

  useEffect(() => { loadTicket() }, [loadTicket])

  const sendReply = async () => {
    if (!replyText.trim() || !ticket || !currentUser) return
    setSending(true)

    const res = await fetch(`/api/tickets/${ticket.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: replyText, is_internal: false }),
    })

    if (!res.ok) { toast.error('Failed to send reply'); setSending(false); return }
    const message = await res.json()

    // Update ticket status if waiting
    if (ticket.status === 'waiting_for_customer') {
      await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'open' }),
      })
      setTicket(prev => prev ? { ...prev, status: 'open' } : prev)
    }

    // Upload files via Supabase storage (storage doesn't use RLS for uploads)
    if (replyFiles.length > 0) {
      for (const file of replyFiles) {
        const path = `tickets/${ticket.id}/${Date.now()}-${file.name}`
        const { data: up } = await supabase.storage.from('attachments').upload(path, file)
        if (up) {
          const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(up.path)
          await fetch(`/api/tickets/${ticket.id}/attachments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message_id: message.id,
              file_name: file.name,
              file_url: publicUrl,
              file_size: file.size,
              mime_type: file.type,
            }),
          })
        }
      }
    }

    setMessages(prev => [...prev, { ...message, sender: { full_name: currentUser.full_name, avatar_url: currentUser.avatar_url } } as TicketMessage & { sender?: UserProfile }])
    setReplyText('')
    setReplyFiles([])
    setSending(false)
    toast.success('Reply sent!')

    await fetch('/api/tickets/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: ticket.id, type: 'customer_reply' }),
    }).catch(() => null)
  }

  const closeTicket = async () => {
    if (!ticket) return
    const confirmed = window.confirm('Are you sure you want to close this ticket?')
    if (!confirmed) return
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed' }),
    })
    if (!res.ok) { toast.error('Failed to close ticket'); return }
    setTicket(prev => prev ? { ...prev, status: 'closed', closed_at: new Date().toISOString() } : prev)
    toast.success('Ticket closed')
  }

  const openEdit = () => {
    if (!ticket) return
    setEditSubject(ticket.subject)
    setEditDescription(ticket.description)
    setEditPriority(ticket.priority as 'low' | 'medium' | 'high')
    setShowEdit(true)
  }

  const saveEdit = async () => {
    if (!ticket || !editSubject.trim() || !editDescription.trim()) { toast.error('Subject and description are required'); return }
    setSavingEdit(true)
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: editSubject, description: editDescription, priority: editPriority }),
    })
    if (!res.ok) { toast.error('Failed to save changes'); setSavingEdit(false); return }
    setTicket(prev => prev ? { ...prev, subject: editSubject, description: editDescription, priority: editPriority } : prev)
    setSavingEdit(false)
    setShowEdit(false)
    toast.success('Ticket updated!')
  }

  if (loading) return <PageLoader />
  if (!ticket) return null

  const isClosed = ['closed', 'resolved'].includes(ticket.status)

  return (
    <div className="animate-slide-in max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/tickets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Tickets
          </Button>
        </Link>
      </div>

      <PageHeader
        title={`#${ticket.ticket_number}: ${ticket.subject}`}
        actions={
          !isClosed ? (
            <div className="flex gap-2">
              {ticket.status === 'new' && (
                <Button variant="outline" size="sm" onClick={openEdit}>
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={closeTicket} className="text-slate-500">
                <XCircle className="h-4 w-4" />
                Close Ticket
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Edit modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Edit Ticket</h2>
              <button onClick={() => setShowEdit(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input value={editSubject} onChange={e => setEditSubject(e.target.value)} placeholder="Brief description of your issue" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={6} placeholder="Describe your issue in detail" />
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={editPriority} onValueChange={v => setEditPriority(v as 'low' | 'medium' | 'high')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 justify-end px-6 pb-5">
              <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button onClick={saveEdit} loading={savingEdit}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Original description */}
              <div className="flex gap-3 mb-6 pb-6 border-b border-slate-100">
                <Avatar className="h-8 w-8 shrink-0">
                  {currentUser?.avatar_url && <AvatarImage src={currentUser.avatar_url} />}
                  <AvatarFallback>{getInitials(currentUser?.full_name ?? 'U')}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-slate-800">You</span>
                    <span className="text-xs text-slate-400">{formatDateTime(ticket.created_at)}</span>
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Original</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap">
                    {ticket.description}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-5">
                {messages.map(msg => {
                  const isCustomer = msg.sender_id === currentUser?.id
                  return (
                    <div key={msg.id} className={`flex gap-3 ${isCustomer ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="h-8 w-8 shrink-0">
                        {msg.sender?.avatar_url && <AvatarImage src={msg.sender.avatar_url} />}
                        <AvatarFallback>{getInitials(msg.sender?.full_name ?? '?')}</AvatarFallback>
                      </Avatar>
                      <div className={`flex-1 ${isCustomer ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-800">
                            {isCustomer ? 'You' : msg.sender?.full_name ?? 'Agent'}
                          </span>
                          <span className="text-xs text-slate-400">{formatRelativeTime(msg.created_at)}</span>
                        </div>
                        <div className={`rounded-xl p-4 text-sm max-w-[85%] whitespace-pre-wrap ${
                          isCustomer
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-50 text-slate-700 border border-slate-100'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Reply form */}
              {!isClosed && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <Textarea
                    placeholder="Write your reply..."
                    rows={4}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                  />

                  {replyFiles.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {replyFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                          <span>{getMimeIcon(f.type)}</span>
                          <span className="flex-1 truncate">{f.name}</span>
                          <span className="text-slate-400">{formatFileSize(f.size)}</span>
                          <button onClick={() => setReplyFiles(prev => prev.filter((_, j) => j !== i))}>
                            <X className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-3">
                    <label className="cursor-pointer p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
                      <Paperclip className="h-4 w-4" />
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={e => setReplyFiles(Array.from(e.target.files ?? []))}
                        accept="image/*,.pdf,.doc,.docx,.txt"
                      />
                    </label>
                    <div className="flex-1" />
                    <Button onClick={sendReply} loading={sending} disabled={!replyText.trim()}>
                      <Send className="h-4 w-4" />
                      Send Reply
                    </Button>
                  </div>
                </div>
              )}

              {isClosed && (
                <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                  <p className="text-sm text-slate-500">This ticket is {ticket.status}.</p>
                  <Link href="/tickets/new">
                    <Button variant="outline" size="sm" className="mt-3">Open New Ticket</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Ticket Info</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status</span>
                <TicketStatusBadge status={ticket.status} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Priority</span>
                <TicketPriorityBadge priority={ticket.priority} />
              </div>
              {ticket.category && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Category</span>
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{ backgroundColor: ticket.category.color + '20', color: ticket.category.color }}
                  >
                    {ticket.category.name}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Created</span>
                <span className="text-slate-700 text-xs">{formatDateTime(ticket.created_at)}</span>
              </div>
            </CardContent>
          </Card>

          {slaRule && (
            <Card>
              <CardHeader><CardTitle>SLA Status</CardTitle></CardHeader>
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
                  Country Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{countryInfo.flag_emoji || COMMON_COUNTRIES.find(c => c.code === countryInfo.country_code)?.flag || '🌐'}</span>
                  <span className="font-medium text-slate-800">{countryInfo.name}</span>
                </div>
                {countryInfo.currency_code && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Currency</span>
                    <span className="text-slate-700">{countryInfo.currency_code} — {countryInfo.currency_name}</span>
                  </div>
                )}
                {countryInfo.calling_code && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Calling Code</span>
                    <span className="text-slate-700">{countryInfo.calling_code}</span>
                  </div>
                )}
                {countryInfo.region && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Region</span>
                    <span className="text-slate-700">{countryInfo.region}</span>
                  </div>
                )}
                {countryInfo.language && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Language</span>
                    <span className="text-slate-700">{countryInfo.language}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {attachments.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Attachments ({attachments.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {attachments.map(att => (
                  <a
                    key={att.id}
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50 transition-colors group"
                  >
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
