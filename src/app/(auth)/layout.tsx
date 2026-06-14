export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: '#EEF2F7' }}>
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1E63FF 0%, #6A5BFF 100%)' }}>

        {/* Background orbs */}
        <div className="absolute top-[-20%] right-[-10%] w-80 h-80 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #ffffff, transparent)' }} />
        <div className="absolute bottom-[-15%] left-[-10%] w-72 h-72 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #ffffff, transparent)' }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }} />

        <div className="relative z-10 text-center max-w-sm">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[18px] mb-8"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}>
            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Smart Support</h1>
          <p className="text-white/70 text-lg mb-10">Smart Productivity and Automation Platform</p>

          {/* Feature pills */}
          <div className="space-y-3">
            {[
              { icon: '🎯', text: 'Smart Ticket Management' },
              { icon: '⚡', text: 'Real-time SLA Monitoring' },
              { icon: '🤖', text: 'Automated Workflows' },
              { icon: '📊', text: 'Advanced Analytics' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-[12px] text-left"
                style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <span className="text-xl">{f.icon}</span>
                <span className="text-white/90 text-sm font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="absolute bottom-6 text-white/40 text-xs">© 2026 Smart Support · All rights reserved</p>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        {/* Mobile logo */}
        <div className="lg:hidden text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-[14px] mb-3"
            style={{ background: 'linear-gradient(90deg, #1E63FF, #6A5BFF)', boxShadow: '0 5px 20px rgba(30,99,255,0.3)' }}>
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ background: 'linear-gradient(90deg, #1E63FF, #6A5BFF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Smart Support</h1>
        </div>

        {/* Card */}
        <div className="w-full max-w-md bg-white rounded-[18px] p-8 shadow-[0_5px_40px_rgba(0,0,0,0.10)] border border-[#E5E7EB]">
          {children}
        </div>
      </div>
    </div>
  )
}
