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
import { Input } from '@/components/ui/input'

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
        <h2 className="text-2xl font-bold text-[#222222] mb-1">Create account</h2>
        <p className="text-[#666666] text-sm">Get started with Smart Support today — it&apos;s free</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full Name"
          type="text"
          placeholder="John Doe"
          icon={<User className="h-4 w-4" />}
          error={errors.full_name?.message}
          {...register('full_name')}
        />

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
            placeholder="Min 8 characters"
            icon={<Lock className="h-4 w-4" />}
            error={errors.password?.message}
            {...register('password')}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-[#666666] hover:text-[#1E63FF] transition-colors">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter password"
          icon={<Lock className="h-4 w-4" />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-[12px] text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 hover:opacity-90 hover:shadow-lg mt-2"
          style={{ background: 'linear-gradient(90deg, #1E63FF, #6A5BFF)', boxShadow: '0 5px 20px rgba(30,99,255,0.3)' }}
        >
          {isSubmitting ? 'Creating account…' : <> Create Account <ArrowRight className="h-4 w-4" /> </>}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-[#E5E7EB] text-center">
        <p className="text-sm text-[#666666]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#1E63FF] hover:text-[#6A5BFF] font-semibold transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
