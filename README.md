# Smart Support — Production SaaS Customer Support Platform

A full-featured, multi-role customer support ticket system built with **Next.js 16**, **Supabase**, **Resend**, and **Tailwind CSS v4**. Three distinct role portals (Customer · Agent · Admin), real-time SLA enforcement via Vercel Cron, automated email workflows, and a complete audit trail.

---

## Live Demo

| Resource | URL |
|---|---|
| **Production App** | https://smart-support-beta.vercel.app |
| **GitHub Repository** | https://github.com/bilalarryn-cmd/smart-support |
| **Customer Portal** | https://smart-support-beta.vercel.app/login |
| **Agent Portal** | https://smart-support-beta.vercel.app/login |
| **Admin Portal** | https://smart-support-beta.vercel.app/admin-login |

---

## What Was Built

### Role Architecture

| Role | Auth Method | Access |
|---|---|---|
| **Customer** | Supabase Auth (email/password) | Own tickets only |
| **Agent** | Supabase Auth (email/password) | All tickets (via service role API) |
| **Admin** | Custom `admin_token` HTTP-only cookie | Full platform + all admin APIs |

### Feature Modules

**Customer Portal**
- Submit tickets with subject, description, priority (low/medium/high), category, country
- Track ticket status with real-time SLA countdown
- View full message history and reply to agents
- File attachment support
- Notification centre (replies + status changes)
- Profile management with flag-based country display

**Agent Portal**
- Priority-sorted queue with SLA urgency indicators
- Ticket detail: full message thread, internal notes (never emailed), attachments, activity log, email history
- One-click status changes, agent assignment
- Canned response library with `{{customer_name}}` / `{{agent_name}}` substitution
- First-response time tracking

**Admin Portal**
- Platform dashboard with live stats (open tickets, SLA breaches, agent performance, emails sent today)
- Full ticket list with multi-filter (status, priority, category, assignee, date)
- Agent management (create, activate/deactivate)
- Category management with colour coding
- SLA rules per priority (response hours, resolution hours, warning threshold %)
- SLA escalation dashboard (real-time breach/warning status)
- Canned responses library management
- Country info browser with flag CDN integration
- Analytics with charts (status distribution, priority breakdown, agent performance, tickets over time)
- Audit logs with human-readable action labels
- Email logs with delivery status (sent/failed/bounced) and template type labels
- Automation logs (cron job history)
- Platform settings

**Automation (Vercel Cron)**
- Runs every 15 minutes (`*/15 * * * *`)
- Sends SLA warning emails at configurable threshold (default 75%)
- Sends SLA breach emails (deduplicated via `sla_warned` / `sla_breached` flags)
- Auto-closes resolved tickets after 72 hours
- Detects duplicate tickets (same customer, same subject within 24 h)
- Logs every run to `automation_jobs` table

**Email System (Resend)**
- `ticket_created` — confirmation on new ticket
- `agent_reply` — customer notified on public agent message
- `status_change` — customer notified on status transitions
- `ticket_closed` / `ticket_resolved` — specialised closing template
- `ticket_closed_auto` — auto-close notification
- `sla_warning` / `sla_breached` — internal escalation alerts
- All sends logged to `email_logs` with Resend message ID

---

## Project Structure

```
src/
├── app/
│   ├── (admin)/admin/          # Admin portal pages
│   │   ├── dashboard/
│   │   ├── tickets/
│   │   ├── agents/
│   │   ├── analytics/
│   │   ├── audit-logs/
│   │   ├── automation-logs/
│   │   ├── canned-responses/
│   │   ├── categories/
│   │   ├── countries/
│   │   ├── email-logs/
│   │   ├── settings/
│   │   ├── sla/
│   │   ├── sla-escalation/
│   │   └── users/
│   ├── (agent)/agent/          # Agent portal pages
│   │   ├── dashboard/
│   │   ├── queue/
│   │   ├── assigned/
│   │   └── tickets/[id]/       # Full ticket detail
│   ├── (auth)/                 # Auth pages
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── admin-login/
│   ├── (customer)/             # Customer portal pages
│   │   ├── dashboard/
│   │   ├── tickets/
│   │   ├── tickets/[id]/
│   │   ├── tickets/new/
│   │   ├── notifications/
│   │   └── profile/
│   └── api/
│       ├── admin/              # Admin-only API routes (cookie auth)
│       │   ├── agents/
│       │   ├── canned-responses/
│       │   ├── categories/
│       │   ├── login/
│       │   ├── logout/
│       │   ├── refresh-countries/
│       │   ├── setup/
│       │   ├── sla-rules/
│       │   ├── tickets/
│       │   └── users/
│       ├── agent/              # Agent API routes (Supabase session)
│       │   ├── queue/
│       │   └── resources/
│       ├── tickets/            # Ticket CRUD + sub-resources
│       │   ├── route.ts
│       │   ├── [id]/route.ts
│       │   ├── [id]/messages/
│       │   ├── [id]/notes/
│       │   ├── [id]/attachments/
│       │   ├── [id]/audit/
│       │   └── [id]/email-logs/
│       ├── cron/sla-check/     # Vercel Cron endpoint
│       ├── automation/
│       ├── categories/
│       ├── countries/[code]/
│       ├── customer/notifications/
│       ├── email-logs/
│       ├── sla/
│       ├── account/
│       └── health/
├── components/
│   ├── admin/
│   │   ├── analytics-charts.tsx
│   │   ├── refresh-flags-button.tsx
│   │   ├── setup-banner.tsx
│   │   └── sla-escalation-actions.tsx
│   ├── shared/
│   │   ├── topbar.tsx          # Bell notification dropdown (live data per role)
│   │   ├── sidebar.tsx
│   │   ├── sla-indicator.tsx
│   │   ├── ticket-status-badge.tsx
│   │   ├── stat-card.tsx
│   │   ├── data-table.tsx
│   │   ├── empty-state.tsx
│   │   ├── loading-spinner.tsx
│   │   └── page-header.tsx
│   └── ui/                     # shadcn/ui primitives
├── lib/
│   ├── admin-auth.ts           # parseAdminToken(), createAdminSession()
│   ├── countries/api.ts        # getCountryInfo(), getFlagImageUrl(), COMMON_COUNTRIES
│   ├── email/resend.ts         # sendEmailWithTemplate()
│   ├── sla/calculator.ts       # isSlaBreached(), isSlaWarning(), getSlaProgressPercentage()
│   ├── supabase/
│   │   ├── admin.ts            # createAdminClient() — service role, bypasses RLS
│   │   ├── server.ts           # createClient() — server-side with cookies
│   │   └── client.ts           # createClient() — browser-side
│   └── utils.ts
├── types/index.ts              # All TypeScript types and interfaces
└── __tests__/
    ├── ticket-creation.test.ts
    ├── agent-reply.test.ts
    ├── status-change-email.test.ts
    ├── sla-logic.test.ts
    └── country-api.test.ts
```

---

## Environment Variables

Create `.env.local` in the project root:

```env
# Supabase — Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # NEVER commit — server-only

# Resend — resend.com > API Keys
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=support@yourdomain.com
RESEND_FROM_NAME=Smart Support

# Admin auth — any long random string (openssl rand -base64 32)
ADMIN_SECRET=your-super-secret-admin-password
ADMIN_JWT_SECRET=another-long-random-secret-for-jwt

# Cron security — set same value in Vercel > Project > Settings > Cron
CRON_SECRET=random-secret-for-cron-protection

# App URL
NEXT_PUBLIC_APP_URL=https://smart-support-beta.vercel.app
```

> **Security:** `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS policies. Never expose it to the browser or commit it to git.

---

## Database Schema

### Core Tables

```sql
-- Extends Supabase auth.users
CREATE TABLE user_profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name     text NOT NULL,
  avatar_url    text,
  role          text NOT NULL DEFAULT 'customer',  -- customer | agent | admin
  phone         text,
  country_code  text DEFAULT 'US',
  timezone      text DEFAULT 'UTC',
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE ticket_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  color       text DEFAULT '#6366F1',
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE sla_rules (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  priority           text NOT NULL UNIQUE,  -- low | medium | high | critical
  response_hours     integer NOT NULL,
  resolution_hours   integer NOT NULL,
  warning_threshold  integer DEFAULT 75,   -- % of window before warning email
  is_active          boolean DEFAULT true,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

CREATE TABLE tickets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number       serial UNIQUE,
  subject             text NOT NULL,
  description         text NOT NULL,
  status              text NOT NULL DEFAULT 'new',
  priority            text NOT NULL DEFAULT 'medium',
  category_id         uuid REFERENCES ticket_categories,
  customer_id         uuid NOT NULL REFERENCES user_profiles,
  assigned_agent_id   uuid REFERENCES user_profiles,
  country_code        text DEFAULT 'US',
  sla_due_at          timestamptz,
  sla_warned          boolean DEFAULT false,
  sla_breached        boolean DEFAULT false,
  first_response_at   timestamptz,
  resolved_at         timestamptz,
  closed_at           timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE TABLE ticket_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid NOT NULL REFERENCES tickets ON DELETE CASCADE,
  sender_id   uuid NOT NULL REFERENCES user_profiles,
  content     text NOT NULL,
  is_internal boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE ticket_internal_notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  uuid NOT NULL REFERENCES tickets ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES user_profiles,
  content    text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE ticket_attachments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    uuid NOT NULL REFERENCES tickets ON DELETE CASCADE,
  message_id   uuid REFERENCES ticket_messages,
  uploaded_by  uuid NOT NULL REFERENCES user_profiles,
  file_name    text NOT NULL,
  file_url     text NOT NULL,
  file_size    integer NOT NULL,
  mime_type    text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE canned_responses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  content    text NOT NULL,  -- supports {{customer_name}} {{agent_name}}
  category   text,
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES user_profiles,
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   uuid,
  old_values  jsonb,
  new_values  jsonb,
  ip_address  text,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE email_logs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id          uuid REFERENCES tickets,
  recipient_email    text NOT NULL,
  recipient_name     text,
  subject            text NOT NULL,
  template_type      text NOT NULL,
  status             text DEFAULT 'sent',
  resend_message_id  text,
  error_message      text,
  sent_at            timestamptz DEFAULT now(),
  created_at         timestamptz DEFAULT now()
);

CREATE TABLE automation_jobs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type           text NOT NULL,
  status             text DEFAULT 'running',
  tickets_processed  integer DEFAULT 0,
  actions_taken      integer DEFAULT 0,
  error_message      text,
  started_at         timestamptz DEFAULT now(),
  completed_at       timestamptz,
  created_at         timestamptz DEFAULT now()
);

CREATE TABLE country_info_cache (
  country_code   text PRIMARY KEY,
  name           text NOT NULL,
  flag_emoji     text,
  flag_url       text,
  currency_code  text,
  currency_name  text,
  calling_code   text,
  region         text,
  subregion      text,
  language       text,
  cached_at      timestamptz DEFAULT now()
);
```

### RLS Policies

```sql
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Customers see only their own data
CREATE POLICY "customer_own_profile" ON user_profiles
  FOR ALL USING (id = auth.uid());

CREATE POLICY "customer_own_tickets" ON tickets
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "customer_own_messages" ON ticket_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tickets WHERE id = ticket_id AND customer_id = auth.uid())
    AND is_internal = false
  );

-- Agents/admins read all tickets
CREATE POLICY "agent_read_all_tickets" ON tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('agent', 'admin')
    )
  );

-- Service role bypasses all RLS — used by all API routes via createAdminClient()
```

---

## API Reference

### Tickets

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/tickets` | Session | List (filtered by role) |
| `POST` | `/api/tickets` | Session | Create + send confirmation email |
| `GET` | `/api/tickets/[id]` | Session | Ticket detail |
| `PATCH` | `/api/tickets/[id]` | Session | Update status/priority/assignment |
| `GET` | `/api/tickets/[id]/messages` | Session | Message thread |
| `POST` | `/api/tickets/[id]/messages` | Session | Reply + email customer |
| `GET` | `/api/tickets/[id]/notes` | Session | Internal notes |
| `POST` | `/api/tickets/[id]/notes` | Session | Add internal note (no email) |
| `GET` | `/api/tickets/[id]/attachments` | Session | Attachment list |
| `GET` | `/api/tickets/[id]/audit` | Session | Audit trail |
| `GET` | `/api/tickets/[id]/email-logs` | Session | Email history |

### Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/admin/login` | — | Admin cookie login |
| `POST` | `/api/admin/logout` | Cookie | Clear session |
| `GET/POST/PATCH/DELETE` | `/api/admin/agents` | Cookie | Agent management |
| `GET/POST/PATCH/DELETE` | `/api/admin/categories` | Cookie | Category management |
| `GET/POST/PATCH/DELETE` | `/api/admin/sla-rules` | Cookie | SLA configuration |
| `GET/POST/PATCH/DELETE` | `/api/admin/canned-responses` | Cookie | Template library |
| `GET/PATCH/DELETE` | `/api/admin/users` | Cookie | User management |
| `POST` | `/api/admin/setup` | Cookie | Seed default data |
| `POST` | `/api/admin/refresh-countries` | Cookie | Refresh country cache |

### Agent

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/agent/queue` | Session | Priority-sorted queue |
| `GET` | `/api/agent/resources` | Session | Agents + canned responses |

### System

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/cron/sla-check` | `CRON_SECRET` header | SLA automation |
| `GET` | `/api/health` | — | Health check |
| `GET` | `/api/categories` | — | Public categories |
| `GET` | `/api/countries/[code]` | Session | Country info with 24h cache |
| `GET` | `/api/customer/notifications` | Session | Notification feed |

---

## SLA Configuration

Default rules (seeded via `/api/admin/setup`):

| Priority | Response | Resolution | Warning At |
|---|---|---|---|
| **Critical** | 1 hour | 4 hours | 75% |
| **High** | 2 hours | 8 hours | 75% |
| **Medium** | 8 hours | 24 hours | 75% |
| **Low** | 48 hours | 120 hours | 75% |

Cron: `*/15 * * * *` — checks breach/warning/auto-close for all open tickets.
Deduplication: `sla_warned` and `sla_breached` flags prevent duplicate emails.

---

## Email Templates

| Template | Trigger | Recipient |
|---|---|---|
| `ticket_created` | New ticket | Customer |
| `agent_reply` | Agent public message | Customer |
| `status_change` | Status transition | Customer |
| `ticket_resolved` | → resolved | Customer |
| `ticket_closed` | → closed | Customer |
| `ticket_closed_auto` | Auto-close after 72h | Customer |
| `sla_warning` | Warning threshold reached | Internal |
| `sla_breached` | Deadline passed | Internal |

---

## Setup Instructions

### 1. Clone & Install

```bash
git clone https://github.com/bilalarryn-cmd/smart-support.git
cd smart-support
npm install
```

### 2. Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Run the SQL schema above in the SQL editor
3. Enable RLS + add policies
4. Copy Project URL, anon key, service role key

### 3. Resend Setup

1. Create account at [resend.com](https://resend.com)
2. Verify your sending domain
3. Create API key

### 4. Environment Variables

```bash
cp .env.example .env.local
# Fill all values
```

### 5. First-Run Seed

```bash
npm run dev
# Login at /admin-login with ADMIN_SECRET
# Click "Run Setup" on the banner — seeds categories and SLA rules
```

### 6. Run Tests

```bash
npx vitest run      # 136 tests, all pass
```

---

## Deployment (Vercel)

```bash
npm install -g vercel
vercel login
vercel --prod
```

Add all `.env.local` variables in Vercel → Project → Settings → Environment Variables.

`vercel.json` already includes cron configuration:

```json
{
  "crons": [
    {
      "path": "/api/cron/sla-check",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth + custom admin cookie |
| Email | Resend |
| Validation | Zod v4 |
| Date utils | date-fns v4 |
| Icons | Lucide React |
| Charts | Recharts |
| UI Primitives | shadcn/ui |
| Testing | Vitest 4 (136 tests) |
| Deployment | Vercel |
| Flag images | flagcdn.com 24×18 PNG |
| Country data | REST Countries API v3.1 + 24h DB cache |

---

## Test Suite

```
Test Files  5 passed (5)
     Tests  136 passed (136)
```

| File | Tests | Area |
|---|---|---|
| `ticket-creation.test.ts` | ~28 | Schema validation, SLA dates, edge cases |
| `agent-reply.test.ts` | ~25 | Insert, validation, audit, status, email |
| `status-change-email.test.ts` | ~22 | Trigger, template, subject, timestamps |
| `sla-logic.test.ts` | ~40 | Status calc, due dates, deduplication, auto-close |
| `country-api.test.ts` | ~21 | Parsing, flag URLs, COMMON_COUNTRIES |

---

## Architecture Notes

### Why Service Role for Agent Data?

All agent and admin data reads go through API routes using `createAdminClient()` (service role), which bypasses RLS. This is because:

- Admin uses a custom HTTP-only cookie — no Supabase session → RLS has no `auth.uid()` to resolve → returns empty data
- Agent has a Supabase session, but cross-customer queries require complex RLS policies that can silently return empty data on edge cases
- A single service-role API layer is auditable, consistent, and free from RLS edge cases

### Bell Notification Dropdown

The topbar bell opens a live dropdown (not a navigation link) that fetches role-specific notifications:
- **Customer**: recent replies and status changes on their tickets
- **Agent**: their current queue (unresolved assigned tickets)
- **Admin**: most recent tickets across the platform

---

*Built with the 3-Layer Build → Audit → Self-Repair system.*
