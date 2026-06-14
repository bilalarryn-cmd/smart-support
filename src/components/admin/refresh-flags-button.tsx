'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function RefreshFlagsButton({ nullCount }: { nullCount: number }) {
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/refresh-countries', { method: 'POST' })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error('Failed to refresh flags'); return }
    toast.success(`${data.updated} country flags updated!`)
    setTimeout(() => window.location.reload(), 800)
  }

  return (
    <Button
      onClick={refresh}
      loading={loading}
      variant={nullCount > 0 ? 'default' : 'outline'}
      className={nullCount > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
    >
      <RefreshCw className="h-4 w-4 mr-2" />
      {nullCount > 0 ? `Fix ${nullCount} Missing Flags` : 'Refresh Flags'}
    </Button>
  )
}
