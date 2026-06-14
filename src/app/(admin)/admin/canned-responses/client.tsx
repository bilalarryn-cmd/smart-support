'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Edit2, Trash2, MessageSquare, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface CannedResponse {
  id: string
  title: string
  content: string
  category: string
  is_active: boolean
  created_at: string
}

const CATEGORIES = ['general', 'resolution', 'escalation', 'follow-up', 'account', 'billing', 'technical']

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-slate-100 text-slate-700',
  resolution: 'bg-emerald-100 text-emerald-700',
  escalation: 'bg-red-100 text-red-700',
  'follow-up': 'bg-blue-100 text-blue-700',
  account: 'bg-purple-100 text-purple-700',
  billing: 'bg-amber-100 text-amber-700',
  technical: 'bg-cyan-100 text-cyan-700',
}

interface FormState { title: string; content: string; category: string }
const EMPTY_FORM: FormState = { title: '', content: '', category: 'general' }

export function CannedResponsesClient({ initialResponses }: { initialResponses: CannedResponse[] }) {
  const [responses, setResponses] = useState<CannedResponse[]>(initialResponses)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const supabase = createClient()

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit = (r: CannedResponse) => { setEditingId(r.id); setForm({ title: r.title, content: r.content, category: r.category }); setShowForm(true) }
  const cancelForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM) }

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) { toast.error('Title and content are required'); return }
    setSaving(true)

    if (editingId) {
      const { data, error } = await supabase
        .from('canned_responses')
        .update({ title: form.title, content: form.content, category: form.category, updated_at: new Date().toISOString() })
        .eq('id', editingId)
        .select()
        .single()
      if (error) { toast.error('Failed to update'); setSaving(false); return }
      setResponses(prev => prev.map(r => r.id === editingId ? data as CannedResponse : r))
      toast.success('Response updated')
    } else {
      const { data, error } = await supabase
        .from('canned_responses')
        .insert({ title: form.title, content: form.content, category: form.category })
        .select()
        .single()
      if (error) { toast.error('Failed to create'); setSaving(false); return }
      setResponses(prev => [...prev, data as CannedResponse])
      toast.success('Response created')
    }

    setSaving(false)
    cancelForm()
  }

  const toggleActive = async (r: CannedResponse) => {
    const { error } = await supabase.from('canned_responses').update({ is_active: !r.is_active }).eq('id', r.id)
    if (error) { toast.error('Failed to update'); return }
    setResponses(prev => prev.map(x => x.id === r.id ? { ...x, is_active: !r.is_active } : x))
  }

  const remove = async (id: string) => {
    if (!window.confirm('Delete this canned response?')) return
    const { error } = await supabase.from('canned_responses').delete().eq('id', id)
    if (error) { toast.error('Failed to delete'); return }
    setResponses(prev => prev.filter(r => r.id !== id))
    toast.success('Deleted')
  }

  const filtered = filter === 'all' ? responses : responses.filter(r => r.category === filter)
  const grouped: Record<string, CannedResponse[]> = {}
  filtered.forEach(r => { grouped[r.category] = [...(grouped[r.category] ?? []), r] })

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Canned Responses"
        subtitle="Pre-written replies agents can use to respond quickly"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Response
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap mb-6">
        {['all', ...CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
              filter === cat ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat} {cat === 'all' ? `(${responses.length})` : `(${responses.filter(r => r.category === cat).length})`}
          </button>
        ))}
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <Card className="mb-6 border-blue-200">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Response' : 'New Canned Response'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Title *"
                placeholder="e.g. Greeting, Issue resolved"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              />
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea
              label="Content *"
              placeholder="Use {{customer_name}} and {{agent_name}} as placeholders"
              rows={8}
              value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
            />
            <p className="text-xs text-slate-400">
              Use <code className="bg-slate-100 px-1 rounded">{'{{customer_name}}'}</code> and <code className="bg-slate-100 px-1 rounded">{'{{agent_name}}'}</code> as dynamic placeholders.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={cancelForm}><X className="h-4 w-4" /> Cancel</Button>
              <Button onClick={save} loading={saving}><Check className="h-4 w-4" /> {editingId ? 'Save Changes' : 'Create'}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Responses grouped by category */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No canned responses found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${CATEGORY_COLORS[category] ?? 'bg-slate-100 text-slate-700'}`}>
                  {category}
                </span>
                <span className="text-xs text-slate-400">{items.length} response{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-3">
                {items.map(r => (
                  <Card key={r.id} className={r.is_active ? '' : 'opacity-60'}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-semibold text-slate-800 text-sm">{r.title}</p>
                            {!r.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                          </div>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-3">{r.content}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => toggleActive(r)}
                            title={r.is_active ? 'Deactivate' : 'Activate'}
                            className={`p-1.5 rounded-lg transition-colors text-xs ${r.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-50'}`}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEdit(r)}
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => remove(r.id)}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
