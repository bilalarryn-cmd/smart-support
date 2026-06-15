'use client'

import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnalyticsData } from '@/types'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

interface Props { data: AnalyticsData }

export function AnalyticsCharts({ data }: Props) {
  const statusData = data.ticketsByStatus.map(d => ({
    name: d.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value: d.count,
  }))

  const priorityData = data.ticketsByPriority.map(d => ({
    name: d.priority.charAt(0).toUpperCase() + d.priority.slice(1),
    value: d.count,
    fill: d.priority === 'high' ? '#EF4444' : d.priority === 'medium' ? '#F59E0B' : '#10B981',
  }))

  const categoryData = data.ticketsByCategory.map(d => ({
    name: d.category.length > 15 ? d.category.slice(0, 13) + '…' : d.category,
    count: d.count,
  }))

  const timeData = data.ticketsOverTime.map(d => ({
    date: d.date.slice(5),
    tickets: d.count,
  }))

  return (
    <div className="space-y-6">
      {/* Row 1: Line chart + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Tickets Over Last 14 Days</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Line type="monotone" dataKey="tickets" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: '#3B82F6' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>By Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ percent }: { name?: string; percent?: number }) => (percent ?? 0) > 0.05 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''} labelLine={false}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Priority + Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Tickets by Priority</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={priorityData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} width={65} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {priorityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tickets by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={90} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tickets by Country */}
      {data.ticketsByCountry.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Tickets by Country</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(180, data.ticketsByCountry.length * 36)}>
              <BarChart data={data.ticketsByCountry.map(d => ({ name: d.country, count: d.count }))} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} width={45} />
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} />
                <Bar dataKey="count" fill="#8B5CF6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Agent Performance */}
      {data.agentPerformance.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Agent Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Agent</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolved</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Response</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolution Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.agentPerformance.map(agent => {
                    const rate = agent.assigned > 0 ? Math.round((agent.resolved / agent.assigned) * 100) : 0
                    return (
                      <tr key={agent.agent_id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-medium text-slate-800">{agent.agent_name}</td>
                        <td className="py-3 px-4 text-slate-600">{agent.assigned}</td>
                        <td className="py-3 px-4 text-emerald-600 font-medium">{agent.resolved}</td>
                        <td className="py-3 px-4 text-slate-600">{agent.avg_response_hours}h</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${rate}%` }} />
                            </div>
                            <span className="text-xs text-slate-600 w-8">{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email stats */}
      <Card>
        <CardHeader><CardTitle>Email Delivery Stats</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Sent', value: data.emailStats.total, color: 'text-blue-700', bg: 'bg-blue-50' },
              { label: 'Delivered', value: data.emailStats.sent, color: 'text-emerald-700', bg: 'bg-emerald-50' },
              { label: 'Failed', value: data.emailStats.failed, color: 'text-red-700', bg: 'bg-red-50' },
              { label: 'Bounced', value: data.emailStats.bounced, color: 'text-amber-700', bg: 'bg-amber-50' },
            ].map(item => (
              <div key={item.label} className={`rounded-xl p-4 ${item.bg}`}>
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className={`text-3xl font-bold mt-1 ${item.color}`}>{item.value}</p>
                {data.emailStats.total > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    {Math.round((item.value / data.emailStats.total) * 100)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
