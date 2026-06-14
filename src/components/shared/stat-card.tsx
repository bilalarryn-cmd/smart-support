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
    light: { bg: 'bg-[#f0f4ff]', iconBg: 'bg-[#1E63FF]', icon: 'text-white', value: 'text-[#1E63FF]', title: 'text-[#666666]' },
    solid: { bg: '', iconBg: 'bg-white/20', icon: 'text-white', value: 'text-white', title: 'text-white/80' },
  },
  green: {
    light: { bg: 'bg-[#f0fdf4]', iconBg: 'bg-[#22C55E]', icon: 'text-white', value: 'text-[#22C55E]', title: 'text-[#666666]' },
    solid: { bg: '', iconBg: 'bg-white/20', icon: 'text-white', value: 'text-white', title: 'text-white/80' },
  },
  amber: {
    light: { bg: 'bg-[#fffbeb]', iconBg: 'bg-[#F59E0B]', icon: 'text-white', value: 'text-[#F59E0B]', title: 'text-[#666666]' },
    solid: { bg: '', iconBg: 'bg-white/20', icon: 'text-white', value: 'text-white', title: 'text-white/80' },
  },
  red: {
    light: { bg: 'bg-[#fff5f5]', iconBg: 'bg-[#EF4444]', icon: 'text-white', value: 'text-[#EF4444]', title: 'text-[#666666]' },
    solid: { bg: '', iconBg: 'bg-white/20', icon: 'text-white', value: 'text-white', title: 'text-white/80' },
  },
  purple: {
    light: { bg: 'bg-[#f5f3ff]', iconBg: 'bg-[#6A5BFF]', icon: 'text-white', value: 'text-[#6A5BFF]', title: 'text-[#666666]' },
    solid: { bg: '', iconBg: 'bg-white/20', icon: 'text-white', value: 'text-white', title: 'text-white/80' },
  },
  slate: {
    light: { bg: 'bg-[#f8fafc]', iconBg: 'bg-[#64748b]', icon: 'text-white', value: 'text-[#222222]', title: 'text-[#666666]' },
    solid: { bg: '', iconBg: 'bg-white/20', icon: 'text-white', value: 'text-white', title: 'text-white/80' },
  },
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'blue', variant = 'light', className }: StatCardProps) {
  const c = colorMap[color][variant]

  return (
    <div
      className={cn(
        'rounded-[14px] p-5 flex gap-4 items-start transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
        variant === 'solid'
          ? 'text-white shadow-[0_5px_20px_rgba(0,0,0,0.15)]'
          : `bg-white border border-[#E5E7EB] shadow-[0_5px_20px_rgba(0,0,0,0.08)] ${c.bg}`,
        className
      )}
      style={variant === 'solid' ? { background: 'linear-gradient(90deg, #1E63FF, #6A5BFF)' } : undefined}
    >
      <div className={cn('rounded-[10px] p-2.5 shrink-0', c.iconBg)}>
        <Icon className={cn('h-5 w-5', c.icon)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium truncate', c.title)}>{title}</p>
        <p className={cn('text-2xl font-bold mt-0.5', c.value)}>{value}</p>
        {subtitle && <p className={cn('text-xs mt-0.5 opacity-70', c.title)}>{subtitle}</p>}
        {trend && (
          <p className={cn('text-xs font-medium mt-1', variant === 'solid' ? 'text-white/80' : trend.value >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]')}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
    </div>
  )
}
