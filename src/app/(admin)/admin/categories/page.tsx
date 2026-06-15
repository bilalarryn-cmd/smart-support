'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Tag, Plus, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { PageLoader } from '@/components/shared/loading-spinner'
import { formatDate } from '@/lib/utils'
import type { TicketCategory } from '@/types'

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#6B7280', '#F97316', '#06B6D4']

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<TicketCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TicketCategory | null>(null)
  const [form, setForm] = useState({ name: '', description: '', color: '#3B82F6', is_active: true })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const res = await fetch('/api/admin/categories')
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setCategories(data.categories as TicketCategory[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', description: '', color: '#3B82F6', is_active: true })
    setDialogOpen(true)
  }

  const openEdit = (cat: TicketCategory) => {
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description ?? '', color: cat.color, is_active: cat.is_active })
    setDialogOpen(true)
  }

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)

    if (editing) {
      const res = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, updates: form }),
      })
      if (!res.ok) { toast.error('Failed to update'); setSaving(false); return }
      const data = await res.json()
      setCategories(prev => prev.map(c => c.id === editing.id ? data.category as TicketCategory : c))
      toast.success('Category updated')
    } else {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { toast.error('Failed to create'); setSaving(false); return }
      const data = await res.json()
      setCategories(prev => [...prev, data.category as TicketCategory])
      toast.success('Category created')
    }

    setSaving(false)
    setDialogOpen(false)
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return
    const res = await fetch('/api/admin/categories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) { toast.error('Cannot delete — category may be in use'); return }
    setCategories(prev => prev.filter(c => c.id !== id))
    toast.success('Category deleted')
  }

  const toggleActive = async (cat: TicketCategory) => {
    const res = await fetch('/api/admin/categories', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cat.id, updates: { is_active: !cat.is_active } }),
    })
    if (!res.ok) return
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: !cat.is_active } : c))
  }

  return (
    <div className="animate-slide-in">
      <PageHeader
        title="Ticket Categories"
        subtitle={`${categories.length} categories`}
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" />New Category</Button>}
      />

      {loading ? <PageLoader /> : categories.length === 0 ? (
        <EmptyState icon={Tag} title="No categories" description="Create categories to organize tickets." action={<Button onClick={openCreate}><Plus className="h-4 w-4" />Create Category</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <Card key={cat.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: cat.color + '20' }}>
                      <Tag className="h-5 w-5" style={{ color: cat.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{cat.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteCategory(cat.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {cat.description && <p className="text-sm text-slate-500">{cat.description}</p>}
                <p className="text-xs text-slate-400 mt-3">{formatDate(cat.created_at)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input label="Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Category name" />
            <Textarea label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" rows={3} />
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, color }))}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${form.color === color ? 'border-slate-700 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={saving}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
