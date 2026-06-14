'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Clock, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PageLoader } from '@/components/shared/loading-spinner'
import type { SlaRule, TicketPriority } from '@/types'

const PRIORITY_CONFIG = {
  high: { label: 'High Priority', color: 'bg-red-50 border-red-100', icon: '🔴', textColor: 'text-red-700' },
  medium: { label: 'Medium Priority', color: 'bg-amber-50 border-amber-100', icon: '🟡', textColor: 'text-amber-700' },
  low: { label: 'Low Priority', color: 'bg-emerald-50 border-emerald-100', icon: '🟢', textColor: 'text-emerald-700' },
}

export default function AdminSlaPage() {
  const [rules, setRules] = useState<SlaRule[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<SlaRule | null>(null)
  const [form, setForm] = useState({ response_hours: 0, resolution_hours: 0, warning_threshold: 80, is_active: true })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('sla_rules').select('*').order('priority').then(({ data }) => {
      setRules((data ?? []) as SlaRule[])
      setLoading(false)
    })
  }, [])

  const openEdit = (rule: SlaRule) => {
    setEditing(rule)
    setForm({
      response_hours: rule.response_hours,
      resolution_hours: rule.resolution_hours,
      warning_threshold: rule.warning_threshold,
      is_active: rule.is_active,
    })
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    const { error } = await supabase.from('sla_rules').update(form).eq('id', editing.id)
    if (error) { toast.error('Failed to update SLA rule'); setSaving(false); return }
    setRules(prev => prev.map(r => r.id === editing.id ? { ...r, ...form } : r))
    setEditing(null)
    setSaving(false)
    toast.success('SLA rule updated')
  }

  if (loading) return <PageLoader />

  return (
    <div className="animate-slide-in">
      <PageHeader title="SLA Rules" subtitle="Configure response and resolution time targets" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {(Object.keys(PRIORITY_CONFIG) as TicketPriority[]).map(priority => {
          const rule = rules.find(r => r.priority === priority)
          const config = PRIORITY_CONFIG[priority]
          if (!rule) return null

          return (
            <div key={priority} className={`rounded-2xl border p-6 ${config.color}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{config.icon}</span>
                  <span className={`font-semibold ${config.textColor}`}>{config.label}</span>
                </div>
                <button onClick={() => openEdit(rule)} className="p-1.5 rounded-lg hover:bg-white/60 text-slate-500">
                  <Pencil className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="bg-white/70 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Response Time</p>
                  <p className={`text-2xl font-bold ${config.textColor}`}>{rule.response_hours}h</p>
                </div>
                <div className="bg-white/70 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Resolution Time</p>
                  <p className={`text-2xl font-bold ${config.textColor}`}>{rule.resolution_hours}h</p>
                </div>
                <div className="bg-white/70 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Warning at</p>
                  <p className={`text-2xl font-bold ${config.textColor}`}>{rule.warning_threshold}%</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Active</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rule.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                    {rule.is_active ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>SLA Thresholds</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="text-3xl mb-2">🟢</div>
              <p className="font-semibold text-emerald-700">Safe</p>
              <p className="text-sm text-slate-500 mt-1">Under 60% elapsed</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="text-3xl mb-2">🟡</div>
              <p className="font-semibold text-amber-700">Warning</p>
              <p className="text-sm text-slate-500 mt-1">60-99% elapsed</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl border border-red-100">
              <div className="text-3xl mb-2">🔴</div>
              <p className="font-semibold text-red-700">Breached</p>
              <p className="text-sm text-slate-500 mt-1">100%+ elapsed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={v => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit SLA Rule — {editing?.priority?.toUpperCase()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label="Response Time (hours)"
              type="number"
              min="1"
              value={form.response_hours}
              onChange={e => setForm(p => ({ ...p, response_hours: Number(e.target.value) }))}
            />
            <Input
              label="Resolution Time (hours)"
              type="number"
              min="1"
              value={form.resolution_hours}
              onChange={e => setForm(p => ({ ...p, resolution_hours: Number(e.target.value) }))}
            />
            <Input
              label="Warning Threshold (%)"
              type="number"
              min="1"
              max="99"
              value={form.warning_threshold}
              onChange={e => setForm(p => ({ ...p, warning_threshold: Number(e.target.value) }))}
            />
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} loading={saving}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
