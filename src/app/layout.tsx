import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { PWARegister } from '@/components/pwa-register'

export const metadata: Metadata = {
  title: 'Smart Productivity and Automation Platform',
  description: 'Customer Support Ticket Management Platform',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Smart Support',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1E63FF',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        {children}
        <Toaster position="top-right" richColors />
        <PWARegister />
      </body>
    </html>
  )
}
