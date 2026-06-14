'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'link'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

const variantClasses: Record<string, string> = {
  default: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200',
  outline: 'border border-blue-200 bg-white hover:bg-blue-50 text-blue-700',
  ghost: 'hover:bg-blue-50 text-slate-600 hover:text-blue-700',
  destructive: 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
  link: 'text-blue-600 hover:text-blue-800 underline-offset-4 hover:underline',
}

const sizeClasses: Record<string, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-10 px-4 text-sm rounded-xl',
  lg: 'h-11 px-6 text-base rounded-xl',
  icon: 'h-9 w-9 rounded-xl',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
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
