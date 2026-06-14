import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[#222222]">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666666]">
              {icon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'flex h-10 w-full border bg-white px-3 py-2 text-sm text-[#222222]',
              'placeholder:text-[#999999]',
              'focus:outline-none focus:ring-2 focus:ring-[#1E63FF]/30 focus:border-[#1E63FF]',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'transition-all duration-150',
              'rounded-[10px] border-[#E5E7EB]',
              'shadow-[0_2px_6px_rgba(0,0,0,0.04)]',
              icon && 'pl-10',
              error && 'border-[#EF4444] focus:ring-[#EF4444]/30 focus:border-[#EF4444]',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-[#EF4444]">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
