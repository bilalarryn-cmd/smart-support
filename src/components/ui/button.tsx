'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'link'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

const variantClasses: Record<string, string> = {
  default: 'text-white shadow-sm transition-all duration-200 hover:opacity-90 hover:shadow-md',
  outline: 'border border-[#E5E7EB] bg-white hover:bg-[#f0f4ff] text-[#1E63FF] hover:border-[#1E63FF]',
  ghost: 'hover:bg-[#f0f4ff] text-[#666666] hover:text-[#1E63FF]',
  destructive: 'bg-[#EF4444] hover:bg-red-600 text-white shadow-sm',
  secondary: 'bg-[#EEF2F7] hover:bg-[#e2e8f0] text-[#222222]',
  link: 'text-[#1E63FF] hover:text-[#6A5BFF] underline-offset-4 hover:underline',
}

const sizeClasses: Record<string, string> = {
  sm: 'h-8 px-3 text-xs rounded-[10px]',
  md: 'h-10 px-4 text-sm rounded-[12px]',
  lg: 'h-11 px-6 text-base rounded-[12px]',
  icon: 'h-9 w-9 rounded-[10px]',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', loading, disabled, style, children, ...props }, ref) => {
    const isDefault = variant === 'default'
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={isDefault ? { background: 'linear-gradient(90deg, #1E63FF, #6A5BFF)', ...style } : style}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E63FF]/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
