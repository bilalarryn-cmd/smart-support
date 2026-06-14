'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

function GlassInput({ icon: Icon, error, label, ...props }: { icon: React.ElementType; error?: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-blue-100/80">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/60 pointer-events-none" />
        <input
          {...props}
          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-blue-300/40 outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(8px)',
          }}
          onFocus={e => { e.target.style.border = '1px solid rgba(99,102,241,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)' }}
          onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none' }}
        />
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name, role: 'customer' },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) { toast.error(error.message); return }
    toast.success('Account created! Please check your email to confirm.')
    router.push('/login')
  }

  return (
    <div>
      <div className="mb-7">
        <h2 className="text-2xl font-bold text-white mb-1">Create account</h2>
        <p className="text-blue-200/60 text-sm">Get started with Smart Support today</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <GlassInput label="Full Name" icon={User} type="text" placeholder="John Doe" error={errors.full_name?.message} {...register('full_name')} />
        <GlassInput label="Email Address" icon={Mail} type="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />

        {/* Password with toggle */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-blue-100/80">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300/60 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Min 8 characters"
              {...register('password')}
              className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-white placeholder:text-blue-300/40 outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
              onFocus={e => { e.target.style.border = '1px solid rgba(99,102,241,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)' }}
              onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none' }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-300/60 hover:text-blue-200 transition-colors">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
        </div>

        <GlassInput label="Confirm Password" icon={Lock} type="password" placeholder="Re-enter password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 mt-2"
          style={{
            background: 'linear-gradient(135deg, #4f46e5, #2563eb)',
            boxShadow: '0 4px 20px rgba(79,70,229,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 28px rgba(79,70,229,0.6), inset 0 1px 0 rgba(255,255,255,0.15)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(79,70,229,0.4), inset 0 1px 0 rgba(255,255,255,0.15)')}
        >
          {isSubmitting ? 'Creating account…' : <>Create Account <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>

      <div className="mt-1 pt-6 border-t border-white/10 text-center">
        <p className="text-sm text-blue-200/50">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-300 hover:text-white font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
