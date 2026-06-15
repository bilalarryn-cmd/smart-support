'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { Zap, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SetupBanner() {
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)

  if (dismissed) return null

  const runSetup = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/setup', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message ?? 'Setup complete!')
        setDismissed(true)
        window.location.reload()
      } else {
        toast.error(data.error ?? 'Setup failed')
      }
    } catch {
      toast.error('Setup failed')
    }
    setLoading(false)
  }

  return (
    <div className="mb-6 flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
        <Zap className="h-5 w-5 text-blue-600" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-blue-900">Platform not set up yet</p>
        <p className="text-sm text-blue-600">Click "Quick Setup" to create default categories, SLA rules, and canned responses.</p>
      </div>
      <Button onClick={runSetup} loading={loading} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
        Quick Setup
      </Button>
      <button onClick={() => setDismissed(true)} className="text-blue-400 hover:text-blue-600 shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
