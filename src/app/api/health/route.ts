import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Smart Productivity and Automation Platform',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
}
