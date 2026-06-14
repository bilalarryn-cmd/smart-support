'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) { toast.error(error.message); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
    const role = profile?.role ?? 'customer'
    if (role === 'admin') router.push('/admin/dashboard')
    else if (role === 'agent') router.push('/agent/dashboard')
    else router.push('/dashboard')
    router.refresh()
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#222222] mb-1">Welcome back</h2>
        <p className="text-[#666666] text-sm">Sign in to your Smart Support account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
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

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-[#1E63FF] hover:text-[#6A5BFF] font-medium transition-colors">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-[12px] text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 hover:opacity-90 hover:shadow-lg"
          style={{ background: 'linear-gradient(90deg, #1E63FF, #6A5BFF)', boxShadow: '0 5px 20px rgba(30,99,255,0.3)' }}
        >
          {isSubmitting ? 'Signing in…' : <> Sign In <ArrowRight className="h-4 w-4" /> </>}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-[#E5E7EB] text-center">
        <p className="text-sm text-[#666666]">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#1E63FF] hover:text-[#6A5BFF] font-semibold transition-colors">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}
