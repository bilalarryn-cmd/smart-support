'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Upload, X, FileText, Image as ImageIcon, File, Loader2 } from 'lucide-react'
import { COMMON_COUNTRIES, getFlagImageUrl } from '@/lib/countries/api'
import type { TicketCategory } from '@/types'

const COUNTRY_CATEGORIES: Record<string, string[]> = {
  US: ['Technical Support', 'Billing & Payments', 'Account Verification', 'API Support', 'General Inquiry'],
  GB: ['Technical Support', 'Billing & Payments', 'Account Verification', 'General Inquiry'],
  CA: ['Technical Support', 'Billing & Payments', 'Account Verification', 'General Inquiry'],
  AU: ['Technical Support', 'Billing & Payments', 'Account Verification', 'General Inquiry'],
  DE: ['Technical Support', 'Account Verification', 'Billing & Payments', 'General Inquiry'],
  FR: ['Technical Support', 'Account Verification', 'Billing & Payments', 'General Inquiry'],
  IN: ['OTP / SMS Issues', 'Account Verification', 'Technical Support', 'Payment Issues', 'General Inquiry'],
  PK: ['OTP / SMS Issues', 'Account Verification', 'Technical Support', 'Payment Issues', 'General Inquiry'],
  JP: ['Technical Support', 'Account Verification', 'Billing & Payments', 'General Inquiry'],
  BR: ['Payment Issues', 'Technical Support', 'Account Verification', 'General Inquiry'],
  MX: ['Payment Issues', 'Technical Support', 'Account Verification', 'General Inquiry'],
  NG: ['Payment Issues', 'OTP / SMS Issues', 'Account Verification', 'Technical Support'],
  ZA: ['Payment Issues', 'Technical Support', 'Account Verification', 'General Inquiry'],
  SG: ['API Support', 'Technical Support', 'Billing & Payments', 'Account Verification'],
  AE: ['Account Verification', 'OTP / SMS Issues', 'Technical Support', 'Billing & Payments'],
}
import { formatFileSize, getMimeIcon } from '@/lib/utils'

const schema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200),
  description: z.string().min(20, 'Please provide more detail (min 20 characters)').max(5000),
  priority: z.enum(['low', 'medium', 'high']),
  category_id: z.string().min(1, 'Please select a category'),
  country_code: z.string().min(1, 'Please select your country'),
})
type FormData = z.infer<typeof schema>

interface UploadedFile {
  file: File
  preview?: string
}

export default function CreateTicketPage() {
  const [categories, setCategories] = useState<TicketCategory[]>([])
  const [allCategories, setAllCategories] = useState<TicketCategory[]>([])
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [countryInfo, setCountryInfo] = useState<{ flag_emoji: string; name: string; currency_code?: string; currency_name?: string; calling_code?: string; region?: string; subregion?: string; language?: string } | null>(null)
  const [countryLoading, setCountryLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium', country_code: 'US' },
  })

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        const all = data as TicketCategory[]
        setAllCategories(all)
        // Apply current country filter immediately after load
        const currentCountry = watch('country_code')
        const allowed = currentCountry ? COUNTRY_CATEGORIES[currentCountry] : null
        if (allowed) {
          const ordered = allowed.map(name => all.find(c => c.name === name)).filter(Boolean) as TicketCategory[]
          setCategories(ordered.length > 0 ? ordered : all)
        } else {
          setCategories(all)
        }
      }
    })
  }, [])

  const handleCountryChange = async (code: string) => {
    setValue('country_code', code)
    setValue('category_id', '')

    // Filter categories based on country
    const allowed = COUNTRY_CATEGORIES[code]
    if (allowed) {
      const ordered = allowed
        .map(name => allCategories.find(c => c.name === name))
        .filter(Boolean) as TicketCategory[]
      setCategories(ordered.length > 0 ? ordered : allCategories)
    } else {
      setCategories(allCategories)
    }

    setCountryLoading(true)
    try {
      const res = await fetch(`/api/countries/${code}`)
      if (res.ok) setCountryInfo(await res.json())
      else setCountryInfo(null)
    } catch {
      setCountryInfo(null)
    } finally {
      setCountryLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files ?? [])
    const validFiles = newFiles.filter(f => {
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} exceeds 10MB limit`); return false }
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
      if (!validTypes.includes(f.type) && !f.type.startsWith('image/')) { toast.error(`${f.name}: unsupported file type`); return false }
      return true
    })

    setFiles(prev => [
      ...prev,
      ...validFiles.map(file => ({
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      })),
    ])
  }

  const removeFile = (index: number) => {
    setFiles(prev => {
      const updated = [...prev]
      if (updated[index].preview) URL.revokeObjectURL(updated[index].preview!)
      updated.splice(index, 1)
      return updated
    })
  }

  const onSubmit = async (data: FormData) => {
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: data.subject,
        description: data.description,
        priority: data.priority,
        category_id: data.category_id,
        country_code: data.country_code,
      }),
    })

    const ticket = await res.json()
    if (!res.ok) {
      toast.error(ticket.error ?? 'Failed to create ticket. Please try again.')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); return }

    // Upload attachments
    if (files.length > 0) {
      setUploading(true)
      for (const { file } of files) {
        const path = `tickets/${ticket.id}/${Date.now()}-${file.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(path, file)

        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(uploadData.path)
          await supabase.from('ticket_attachments').insert({
            ticket_id: ticket.id,
            uploaded_by: user.id,
            file_name: file.name,
            file_url: publicUrl,
            file_size: file.size,
            mime_type: file.type,
          })
        }
      }
      setUploading(false)
    }

    // NOTE: The confirmation email is already sent server-side by POST /api/tickets.
    // Do not send it again here, or the customer receives a duplicate.

    // Audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'ticket.created',
      entity_type: 'ticket',
      entity_id: ticket.id,
      new_values: { subject: data.subject, priority: data.priority, status: 'new' },
    })

    toast.success('Ticket created successfully!')
    router.push(`/tickets/${ticket.id}`)
  }

  const priority = watch('priority')
  const categoryId = watch('category_id')
  const countryCode = watch('country_code')

  return (
    <div className="animate-slide-in max-w-3xl mx-auto">
      <PageHeader
        title="Create New Ticket"
        subtitle="Describe your issue and our team will respond shortly"
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <Input
                label="Subject *"
                placeholder="Brief description of your issue"
                error={errors.subject?.message}
                {...register('subject')}
              />

              <Textarea
                label="Description *"
                placeholder="Please describe your issue in detail. Include any error messages, steps to reproduce, and what you expected to happen."
                rows={6}
                error={errors.description?.message}
                {...register('description')}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Category *</Label>
                  <Select value={categoryId} onValueChange={v => setValue('category_id', v)}>
                    <SelectTrigger className={errors.category_id ? 'border-red-300' : ''}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category_id && <p className="text-xs text-red-600">{errors.category_id.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Priority *</Label>
                  <Select value={priority} onValueChange={v => setValue('priority', v as 'low' | 'medium' | 'high')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">🟢 Low — 120h SLA</SelectItem>
                      <SelectItem value="medium">🟡 Medium — 24h SLA</SelectItem>
                      <SelectItem value="high">🔴 High — 8h SLA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Country *</Label>
                  <Select value={countryCode} onValueChange={handleCountryChange}>
                    <SelectTrigger className={errors.country_code ? 'border-red-300' : ''}>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_COUNTRIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          <span className="flex items-center gap-2">
                            <img src={getFlagImageUrl(c.code)} alt={c.name} width={24} height={18} className="rounded-sm shrink-0" />
                            {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.country_code && <p className="text-xs text-red-600">{errors.country_code.message}</p>}

                  {countryLoading && (
                    <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading country info…
                    </div>
                  )}
                  {!countryLoading && countryInfo && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-2 mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <img src={getFlagImageUrl(watch('country_code'))} alt="" width={32} height={24} className="rounded-sm" />
                        <span className="font-semibold text-slate-800">{countryInfo.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                        {countryInfo.currency_code && (
                          <div>
                            <span className="text-slate-400 text-xs">Currency</span>
                            <p className="font-medium text-slate-700">{countryInfo.currency_code} — {countryInfo.currency_name}</p>
                          </div>
                        )}
                        {countryInfo.calling_code && (
                          <div>
                            <span className="text-slate-400 text-xs">Calling Code</span>
                            <p className="font-medium text-slate-700">{countryInfo.calling_code}</p>
                          </div>
                        )}
                        {countryInfo.region && (
                          <div>
                            <span className="text-slate-400 text-xs">Region</span>
                            <p className="font-medium text-slate-700">{countryInfo.region}{countryInfo.subregion ? ` — ${countryInfo.subregion}` : ''}</p>
                          </div>
                        )}
                        {countryInfo.language && (
                          <div>
                            <span className="text-slate-400 text-xs">Language</span>
                            <p className="font-medium text-slate-700">{countryInfo.language}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-300 hover:bg-blue-50/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-700">Drop files here or click to upload</p>
                <p className="text-xs text-slate-400 mt-1">Images, PDFs, documents — max 10MB each</p>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                />
              </div>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xl">{getMimeIcon(f.file.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{f.file.name}</p>
                        <p className="text-xs text-slate-400">{formatFileSize(f.file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting || uploading} size="lg">
              {uploading ? 'Uploading...' : 'Submit Ticket'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
