import React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: { value: number; label: string }
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate'
  variant?: 'light' | 'solid'
  className?: string
}

const colorMap = {
  blue: {
    light: { bg: 'bg-blue-50', iconBg: 'bg-blue-100', icon: 'text-blue-600', value: 'text-blue-700', title: 'text-blue-500' },
    solid: { bg: 'bg-blue-600', iconBg: 'bg-blue-500', icon: 'text-white', value: 'text-white', title: 'text-blue-100' },
  },
  green: {
    light: { bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', icon: 'text-emerald-600', value: 'text-emerald-700', title: 'text-emerald-500' },
    solid: { bg: 'bg-emerald-500', iconBg: 'bg-emerald-400', icon: 'text-white', value: 'text-white', title: 'text-emerald-100' },
  },
  amber: {
    light: { bg: 'bg-amber-50', iconBg: 'bg-amber-100', icon: 'text-amber-600', value: 'text-amber-700', title: 'text-amber-500' },
    solid: { bg: 'bg-amber-500', iconBg: 'bg-amber-400', icon: 'text-white', value: 'text-white', title: 'text-amber-100' },
  },
  red: {
    light: { bg: 'bg-red-50', iconBg: 'bg-red-100', icon: 'text-red-600', value: 'text-red-700', title: 'text-red-500' },
    solid: { bg: 'bg-red-500', iconBg: 'bg-red-400', icon: 'text-white', value: 'text-white', title: 'text-red-100' },
  },
  purple: {
    light: { bg: 'bg-purple-50', iconBg: 'bg-purple-100', icon: 'text-purple-600', value: 'text-purple-700', title: 'text-purple-500' },
    solid: { bg: 'bg-purple-600', iconBg: 'bg-purple-500', icon: 'text-white', value: 'text-white', title: 'text-purple-100' },
  },
  slate: {
    light: { bg: 'bg-slate-50', iconBg: 'bg-slate-100', icon: 'text-slate-600', value: 'text-slate-700', title: 'text-slate-500' },
    solid: { bg: 'bg-slate-700', iconBg: 'bg-slate-600', icon: 'text-white', value: 'text-white', title: 'text-slate-300' },
  },
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'blue', variant = 'light', className }: StatCardProps) {
  const c = colorMap[color][variant]

  return (
    <div className={cn(
      'rounded-2xl p-5 flex gap-4 items-start transition-all',
      variant === 'solid' ? c.bg : `bg-white border border-slate-100 shadow-sm ${c.bg}`,
      className
    )}>
      <div className={cn('rounded-xl p-3 shrink-0', c.iconBg)}>
        <Icon className={cn('h-5 w-5', c.icon)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', c.title)}>{title}</p>
        <p className={cn('text-2xl font-bold mt-0.5', c.value)}>{value}</p>
        {subtitle && <p className={cn('text-xs mt-0.5 opacity-70', c.title)}>{subtitle}</p>}
        {trend && (
          <p className={cn('text-xs font-medium mt-1', variant === 'solid' ? 'text-white/80' : trend.value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
    </div>
  )
}
