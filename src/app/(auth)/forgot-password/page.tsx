'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const schema = z.object({
  email: z.string().email('Invalid email address'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      toast.error(error.message)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 mb-4">
          <CheckCircle className="h-7 w-7 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Check your email</h2>
        <p className="text-slate-500 text-sm mb-6">
          We&apos;ve sent a password reset link to your email address. Please check your inbox.
        </p>
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Forgot password?</h2>
      <p className="text-slate-500 text-sm mb-8">Enter your email to receive a reset link</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          icon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
          Send Reset Link
        </Button>
      </form>

      <p className="text-center mt-6">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </p>
    </>
  )
}
