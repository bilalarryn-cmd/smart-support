import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Smart Productivity and Automation Platform',
  description: 'Customer Support Ticket Management Platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
