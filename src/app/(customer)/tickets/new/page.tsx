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
import { Upload, X, FileText, Image as ImageIcon, File } from 'lucide-react'
import { COMMON_COUNTRIES } from '@/lib/countries/api'
import type { TicketCategory } from '@/types'
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
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium', country_code: 'US' },
  })

  useEffect(() => {
    supabase.from('ticket_categories').select('*').eq('is_active', true).then(({ data }) => {
      setCategories((data ?? []) as TicketCategory[])
    })
  }, [])

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); return }

    // Get SLA rule
    const { data: slaRule } = await supabase
      .from('sla_rules')
      .select('resolution_hours')
      .eq('priority', data.priority)
      .eq('is_active', true)
      .single()

    const slaDueAt = slaRule
      ? new Date(Date.now() + slaRule.resolution_hours * 60 * 60 * 1000).toISOString()
      : null

    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        subject: data.subject,
        description: data.description,
        priority: data.priority,
        category_id: data.category_id,
        country_code: data.country_code,
        customer_id: user.id,
        status: 'new',
        sla_due_at: slaDueAt,
      })
      .select()
      .single()

    if (error || !ticket) {
      toast.error('Failed to create ticket. Please try again.')
      return
    }

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

    // Send confirmation email via API
    await fetch('/api/tickets/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: ticket.id, type: 'created' }),
    }).catch(() => null)

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

                <div className="space-y-1.5">
                  <Label>Country *</Label>
                  <Select value={countryCode} onValueChange={v => setValue('country_code', v)}>
                    <SelectTrigger className={errors.country_code ? 'border-red-300' : ''}>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_COUNTRIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.flag} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.country_code && <p className="text-xs text-red-600">{errors.country_code.message}</p>}
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
