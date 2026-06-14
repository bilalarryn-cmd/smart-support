# Smart Productivity and Automation Platform

A production-ready Customer Support Ticket Management System built with Next.js 16, Supabase, and Resend.

## Features

- **Role-based access**: Customer, Agent, Admin
- **Full auth flow**: Signup, Login, Forgot Password, Reset Password
- **SLA tracking**: Green/Orange/Red indicators with progress bars
- **Automation**: Vercel Cron every 15 min — SLA warnings, breach alerts, auto-close resolved tickets, duplicate detection
- **Email automation**: Ticket created, agent reply, status change, SLA warning/breach, ticket closed — all logged
- **Country info**: REST Countries API with 24h DB caching (flag, currency, calling code, region, language)
- **Analytics**: Tickets over time, by status/priority/category, agent performance, email delivery stats
- **File uploads**: Images, PDFs, documents via Supabase Storage
- **Audit logs**: Every significant action recorded

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.9 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Email | Resend |
| Deployment | Vercel |
| Cron | Vercel Cron Jobs |
| Charts | Recharts |
| Forms | React Hook Form + Zod |

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd smart-support
npm install
```

### 2. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to finish provisioning

### 3. Run Database Migrations

In Supabase Dashboard → SQL Editor, run in order:

1. Contents of `supabase/migrations/001_initial_schema.sql`
2. Contents of `supabase/migrations/002_seed_data.sql`

### 4. Create Supabase Storage Bucket

In Supabase Dashboard → Storage, create a bucket named `ticket-attachments` with public access.

### 5. Set Environment Variables

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_your-resend-api-key
CRON_SECRET=your-random-secret-string
APP_URL=http://localhost:3000
```

**Where to find these:**
- Supabase URL & Keys: Project Settings → API
- Resend API Key: [resend.com](https://resend.com) → API Keys
- CRON_SECRET: Any random string (e.g., `openssl rand -hex 32`)

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 7. Create Your First Admin User

1. Sign up at `/signup`
2. In Supabase Dashboard → Table Editor → `user_profiles`
3. Find your user row and change `role` to `admin`

---

## Database Schema

13 tables across the platform:

| Table | Purpose |
|-------|---------|
| `user_profiles` | Extended user info (role, country, phone) |
| `ticket_categories` | Support ticket categories with colors |
| `sla_rules` | SLA time limits per priority |
| `tickets` | Main ticket records |
| `ticket_messages` | Customer/agent conversation thread |
| `ticket_internal_notes` | Agent-only notes (hidden from customers) |
| `ticket_attachments` | File uploads linked to tickets |
| `ticket_assignments` | Assignment history log |
| `country_info_cache` | REST Countries API response cache |
| `email_logs` | All sent emails with delivery status |
| `automation_jobs` | Cron job execution history |
| `audit_logs` | Full audit trail of all actions |

Row Level Security (RLS) is enabled on all tables.

---

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/smart-support.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Framework: Next.js (auto-detected)

### 3. Add Environment Variables

In Vercel Project Settings → Environment Variables, add all variables from `.env.local` with production values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_your-resend-api-key
CRON_SECRET=your-random-secret-string
APP_URL=https://your-app.vercel.app
```

### 4. Deploy

Click Deploy. Vercel will build and deploy automatically.

### 5. Configure Supabase Auth Redirect URL

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: Add `https://your-app.vercel.app/reset-password`

### 6. Cron Job (Automatic)

`vercel.json` already configures the cron to run every 15 minutes:

```json
{
  "crons": [{ "path": "/api/cron/sla-check", "schedule": "*/15 * * * *" }]
}
```

This activates automatically on Vercel — no extra setup needed.

---

## Application Structure

```
src/
├── app/
│   ├── (auth)/          # Login, Signup, Forgot/Reset Password
│   ├── (customer)/      # Dashboard, Tickets, Profile, Notifications
│   ├── (agent)/         # Agent Dashboard, Queue, Assigned, Ticket Detail
│   ├── (admin)/         # Admin Dashboard, Users, Agents, Settings, Analytics
│   └── api/             # REST API routes + Cron endpoint
├── components/
│   ├── shared/          # Sidebar, PageHeader, StatCard, SlaIndicator
│   ├── admin/           # Analytics charts
│   └── ui/              # shadcn/ui components
├── lib/
│   ├── supabase/        # Server, browser, and admin clients
│   ├── email/           # Resend templates and sender
│   └── countries/       # REST Countries API with caching
└── types/               # TypeScript interfaces
```

---

## SLA Configuration

Default SLA rules (configurable in Admin → SLA):

| Priority | Response Due | Resolution Due | Warning Threshold |
|----------|-------------|----------------|-------------------|
| Low | 48 hours | 120 hours | 75% elapsed |
| Medium | 8 hours | 24 hours | 75% elapsed |
| High | 2 hours | 8 hours | 75% elapsed |

SLA indicators:
- **Green**: < 60% of time elapsed
- **Orange**: 60-99% of time elapsed (warning)
- **Red**: >= 100% (breached)

---

## Email Templates

All emails are logged to the `email_logs` table with delivery status.

| Template | Trigger |
|----------|---------|
| `ticket_created` | Customer submits new ticket |
| `agent_reply` | Agent sends a message |
| `status_change` | Ticket status updated |
| `sla_warning` | SLA warning threshold reached |
| `sla_breach` | SLA deadline exceeded |
| `ticket_closed` | Ticket closed or auto-closed |

Configure your sending domain in [Resend Dashboard](https://resend.com).

---

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET/POST | `/api/tickets` | List/create tickets |
| GET/PATCH | `/api/tickets/[id]` | Get/update ticket |
| POST | `/api/tickets/email` | Send ticket email |
| GET/POST | `/api/categories` | Manage categories |
| GET/POST | `/api/sla` | Manage SLA rules |
| GET | `/api/email-logs` | View email logs |
| GET | `/api/automation` | View automation jobs |
| GET/POST | `/api/cron/sla-check` | Manual cron trigger |

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
| `RESEND_API_KEY` | Yes | Resend API key for email sending |
| `CRON_SECRET` | Yes | Secret to authorize cron job requests |
| `APP_URL` | Yes | Your app's public URL (no trailing slash) |
