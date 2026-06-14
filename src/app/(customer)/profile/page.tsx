'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { User, Phone, Globe, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { COMMON_COUNTRIES } from '@/lib/countries/api'
import { getInitials } from '@/lib/utils'
import type { UserProfile, CountryInfo } from '@/types'

const schema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  phone: z.string().optional(),
  country_code: z.string().optional(),
  timezone: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null)
  const [countryLoading, setCountryLoading] = useState(false)
  const supabase = createClient()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserEmail(user.email ?? '')

      const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data as UserProfile)
        reset({
          full_name: data.full_name,
          phone: data.phone ?? '',
          country_code: data.country_code ?? 'US',
          timezone: data.timezone ?? 'UTC',
        })
        if (data.country_code) fetchCountryInfo(data.country_code)
      }
      setLoading(false)
    }
    load()
  }, [])

  const fetchCountryInfo = async (code: string) => {
    if (!code) return
    setCountryLoading(true)
    try {
      const res = await fetch(`/api/countries/${code}`)
      if (res.ok) setCountryInfo(await res.json())
      else setCountryInfo(null)
    } catch {
      setCountryInfo(null)
    } finally {
      setCountryLoading(false)
    }
  }

  const handleCountryChange = (code: string) => {
    setValue('country_code', code)
    fetchCountryInfo(code)
  }

  const onSubmit = async (data: FormData) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('user_profiles').update({
      full_name: data.full_name,
      phone: data.phone ?? null,
      country_code: data.country_code ?? null,
      timezone: data.timezone ?? null,
    }).eq('id', user.id)

    if (error) { toast.error('Failed to update profile'); return }
    toast.success('Profile updated successfully!')
    setProfile(prev => prev ? { ...prev, ...data } as UserProfile : prev)
  }

  const countryCode = watch('country_code')

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-40 bg-slate-100 rounded-2xl" /></div>

  return (
    <div className="animate-slide-in max-w-2xl mx-auto">
      <PageHeader title="My Profile" subtitle="Update your account information" />

      <div className="space-y-6">
        {/* Avatar card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-5">
              <Avatar className="h-16 w-16">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                <AvatarFallback className="text-xl bg-blue-100 text-blue-700">
                  {getInitials(profile?.full_name ?? 'U')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-slate-900 text-lg">{profile?.full_name}</h3>
                <p className="text-sm text-slate-500">{userEmail}</p>
                <span className="inline-block mt-1 text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-medium capitalize">
                  {profile?.role}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Full Name"
                icon={<User className="h-4 w-4" />}
                error={errors.full_name?.message}
                {...register('full_name')}
              />

              <Input
                label="Email Address"
                value={userEmail}
                disabled
                icon={<User className="h-4 w-4" />}
              />

              <Input
                label="Phone Number"
                type="tel"
                placeholder="+1 234 567 8900"
                icon={<Phone className="h-4 w-4" />}
                {...register('phone')}
              />

              <div className="space-y-1.5">
                <Label>Country</Label>
                <Select value={countryCode} onValueChange={handleCountryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_COUNTRIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Country details panel */}
              {countryLoading && (
                <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading country details…
                </div>
              )}
              {!countryLoading && countryInfo && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{countryInfo.flag_emoji}</span>
                    <span className="font-semibold text-slate-800">{countryInfo.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    {countryInfo.currency_code && (
                      <div>
                        <span className="text-slate-400 text-xs">Currency</span>
                        <p className="font-medium text-slate-700">{countryInfo.currency_code} — {countryInfo.currency_name}</p>
                      </div>
                    )}
                    {countryInfo.calling_code && (
                      <div>
                        <span className="text-slate-400 text-xs">Calling Code</span>
                        <p className="font-medium text-slate-700">{countryInfo.calling_code}</p>
                      </div>
                    )}
                    {countryInfo.region && (
                      <div>
                        <span className="text-slate-400 text-xs">Region</span>
                        <p className="font-medium text-slate-700">{countryInfo.region}{countryInfo.subregion ? ` — ${countryInfo.subregion}` : ''}</p>
                      </div>
                    )}
                    {countryInfo.language && (
                      <div>
                        <span className="text-slate-400 text-xs">Language</span>
                        <p className="font-medium text-slate-700">{countryInfo.language}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button type="submit" loading={isSubmitting}>Save Changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
