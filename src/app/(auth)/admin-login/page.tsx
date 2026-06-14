'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const result = await res.json()

    if (!res.ok) {
      toast.error(result.error ?? 'Login failed')
      return
    }

    toast.success('Welcome, Admin!')
    router.push('/admin/dashboard')
    router.refresh()
  }

  return (
    <div>
      {/* Admin Badge */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(30,99,255,0.08)', color: '#1E63FF', border: '1px solid rgba(30,99,255,0.2)' }}>
          <ShieldCheck className="h-3.5 w-3.5" />
          Admin Portal
        </div>
      </div>

      <div className="mb-7 text-center">
        <h2 className="text-2xl font-bold text-[#222222] mb-1">Admin Sign In</h2>
        <p className="text-[#666666] text-sm">Restricted access — authorized personnel only</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Admin Email"
          type="email"
          placeholder="admin@example.com"
          icon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            icon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            {...register('password')}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-[#666666] hover:text-[#1E63FF] transition-colors">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-[12px] text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 hover:opacity-90 hover:shadow-lg mt-2"
          style={{ background: 'linear-gradient(90deg, #1E63FF, #6A5BFF)', boxShadow: '0 5px 20px rgba(30,99,255,0.3)' }}
        >
          {isSubmitting ? 'Signing in…' : <><ShieldCheck className="h-4 w-4" /> Access Admin Panel <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-[#E5E7EB] text-center">
        <p className="text-sm text-[#666666]">
          Not an admin?{' '}
          <a href="/login" className="text-[#1E63FF] hover:text-[#6A5BFF] font-semibold transition-colors">
            Customer login
          </a>
        </p>
      </div>
    </div>
  )
}
