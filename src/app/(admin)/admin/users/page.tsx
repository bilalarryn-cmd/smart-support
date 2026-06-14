'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Users, Search, UserCheck, UserX } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PageLoader } from '@/components/shared/loading-spinner'
import { formatDate, getInitials } from '@/lib/utils'
import type { UserProfile } from '@/types'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const supabase = createClient()

  const load = async () => {
    let q = supabase.from('user_profiles').select('*').order('created_at', { ascending: false })
    if (roleFilter !== 'all') q = q.eq('role', roleFilter)
    if (search) q = q.ilike('full_name', `%${search}%`)
    const { data } = await q
    setUsers((data ?? []) as UserProfile[])
    setLoading(false)
  }

  useEffect(() => { load() }, [roleFilter, search])

  const toggleActive = async (userId: string, current: boolean) => {
    const { error } = await supabase.from('user_profiles').update({ is_active: !current }).eq('id', userId)
    if (error) { toast.error('Failed to update user'); return }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !current } : u))
    toast.success(`User ${!current ? 'activated' : 'deactivated'}`)
  }

  const changeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('user_profiles').update({ role: newRole as UserProfile['role'] }).eq('id', userId)
    if (error) { toast.error('Failed to update role'); return }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as UserProfile['role'] } : u))
    toast.success('Role updated')
  }

  const roleColors: Record<string, string> = {
    admin: 'danger',
    agent: 'default',
    customer: 'secondary',
  }

  return (
    <div className="animate-slide-in">
      <PageHeader title="User Management" subtitle={`${users.length} total users`} />

      <Card className="mb-6">
        <CardContent className="pt-5">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input placeholder="Search users..." icon={<Search className="h-4 w-4" />} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? <PageLoader /> : (
        <div className="space-y-3">
          {users.map(user => (
            <div key={user.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800">{user.full_name}</p>
                <p className="text-sm text-slate-500">Joined {formatDate(user.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={roleColors[user.role] as 'default' | 'danger' | 'secondary'}>
                  {user.role}
                </Badge>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Select value={user.role} onValueChange={v => changeRole(user.id, v)}>
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant={user.is_active ? 'outline' : 'default'}
                  onClick={() => toggleActive(user.id, user.is_active)}
                  className="h-8 px-2"
                >
                  {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
