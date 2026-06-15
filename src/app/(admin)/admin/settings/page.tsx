'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { Settings, Save, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export default function AdminSettingsPage() {
  const [cronRunning, setCronRunning] = useState(false)
  const [settings, setSettings] = useState({
    autoCloseResolved: true,
    autoCloseAfterHours: 72,
    duplicatePreventionEnabled: true,
    slaCheckEnabled: true,
    emailNotificationsEnabled: true,
  })

  const triggerCron = async () => {
    setCronRunning(true)
    try {
      const res = await fetch('/api/cron/sla-check', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? 'dev'}` },
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Automation run complete — ${data.actionsTotal} actions taken`)
      } else {
        toast.error('Automation run failed')
      }
    } catch {
      toast.error('Failed to trigger automation')
    }
    setCronRunning(false)
  }

  return (
    <div className="animate-slide-in max-w-3xl mx-auto">
      <PageHeader title="Platform Settings" subtitle="Configure system-wide behavior" />

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Automation Settings</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Close Resolved Tickets</Label>
                <p className="text-xs text-slate-500 mt-0.5">Automatically close tickets that have been resolved for a set time</p>
              </div>
              <Switch
                checked={settings.autoCloseResolved}
                onCheckedChange={v => setSettings(p => ({ ...p, autoCloseResolved: v }))}
              />
            </div>

            {settings.autoCloseResolved && (
              <Input
                label="Auto-close after (hours)"
                type="number"
                value={settings.autoCloseAfterHours}
                onChange={e => setSettings(p => ({ ...p, autoCloseAfterHours: Number(e.target.value) }))}
                className="max-w-xs"
              />
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Duplicate Prevention</Label>
                <p className="text-xs text-slate-500 mt-0.5">Detect and flag duplicate tickets from same customer within 1 hour</p>
              </div>
              <Switch
                checked={settings.duplicatePreventionEnabled}
                onCheckedChange={v => setSettings(p => ({ ...p, duplicatePreventionEnabled: v }))}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>SLA Monitoring</Label>
                <p className="text-xs text-slate-500 mt-0.5">Send warning and breach notifications based on SLA rules</p>
              </div>
              <Switch
                checked={settings.slaCheckEnabled}
                onCheckedChange={v => setSettings(p => ({ ...p, slaCheckEnabled: v }))}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-xs text-slate-500 mt-0.5">Send automated emails for ticket events</p>
              </div>
              <Switch
                checked={settings.emailNotificationsEnabled}
                onCheckedChange={v => setSettings(p => ({ ...p, emailNotificationsEnabled: v }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Manual Automation Trigger</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Manually trigger the automation cron job. This runs SLA checks, sends warning emails, escalates breached tickets, and auto-closes resolved tickets.
            </p>
            <Button onClick={triggerCron} loading={cronRunning} variant="outline">
              <RefreshCw className="h-4 w-4" />
              Run Automation Now
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Email Provider Settings</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <div>
                <p className="font-medium text-slate-700">Provider</p>
                <p className="text-xs text-slate-400">Email delivery service</p>
              </div>
              <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Resend</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <div>
                <p className="font-medium text-slate-700">API Key</p>
                <p className="text-xs text-slate-400">Resend API Key (set in .env)</p>
              </div>
              <span className={`text-xs font-mono px-2 py-1 rounded-full ${process.env.RESEND_API_KEY ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                {process.env.RESEND_API_KEY ? '✅ Configured' : '❌ Missing'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <div>
                <p className="font-medium text-slate-700">From Address</p>
                <p className="text-xs text-slate-400">Sender email for all notifications</p>
              </div>
              <span className="text-xs font-mono text-slate-600">support@smartsupport.app</span>
            </div>
            <p className="text-xs text-slate-400 pt-1">To change provider or API key, update environment variables in Vercel dashboard.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Storage Settings</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <div>
                <p className="font-medium text-slate-700">Provider</p>
                <p className="text-xs text-slate-400">File attachment storage</p>
              </div>
              <span className="text-sm font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">Supabase Storage</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <div>
                <p className="font-medium text-slate-700">Bucket</p>
                <p className="text-xs text-slate-400">Attachment storage bucket name</p>
              </div>
              <span className="text-xs font-mono text-slate-600">attachments</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <div>
                <p className="font-medium text-slate-700">Max File Size</p>
                <p className="text-xs text-slate-400">Per attachment upload limit</p>
              </div>
              <span className="text-xs font-mono text-slate-600">10 MB</span>
            </div>
            <p className="text-xs text-slate-400 pt-1">Storage is managed via Supabase dashboard. Ensure the "attachments" bucket is set to public.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Environment Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Supabase URL</span>
              <span className="text-slate-700 font-mono text-xs">{process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configured' : '❌ Missing'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Resend Email</span>
              <span className="text-slate-700 font-mono text-xs">{process.env.RESEND_API_KEY ? '✅ Configured' : '❌ Missing'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Cron Secret</span>
              <span className="text-slate-700 font-mono text-xs">{process.env.CRON_SECRET ? '✅ Configured' : '❌ Missing'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">App URL</span>
              <span className="text-slate-700 font-mono text-xs">{process.env.APP_URL ?? 'localhost:3000'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
