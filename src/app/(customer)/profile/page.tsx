'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { User, Phone, Globe, Loader2, Trash2, AlertTriangle } from 'lucide-react'
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)
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

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return
    setDeleting(true)
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      if (!res.ok) { toast.error('Failed to delete account'); return }
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch {
      toast.error('Something went wrong')
    } finally {
      setDeleting(false)
    }
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
                    <span className="text-2xl">{countryInfo.flag_emoji || COMMON_COUNTRIES.find(c => c.code === countryInfo.country_code)?.flag || '🌐'}</span>
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
        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showDeleteConfirm ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">Delete Account</p>
                  <p className="text-xs text-slate-500 mt-0.5">Permanently delete your account and all your data. This cannot be undone.</p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700 font-medium">This will permanently delete your account, all your tickets and data.</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-2">Type <span className="font-bold text-slate-800">DELETE</span> to confirm:</p>
                  <input
                    type="text"
                    value={deleteInput}
                    onChange={e => setDeleteInput(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteInput('') }}
                    className="flex-1 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteInput !== 'DELETE' || deleting}
                    className="flex-1 py-2 text-sm font-semibold text-white rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {deleting ? 'Deleting…' : 'Delete My Account'}
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
