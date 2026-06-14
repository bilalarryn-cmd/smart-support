# Smart Productivity and Automation Platform — Architecture

## 1. Database Schema

### Users (managed by Supabase Auth)
- id (uuid, PK)
- email (text)
- created_at (timestamptz)

### UserProfiles
- id (uuid, PK, FK → auth.users)
- full_name (text)
- avatar_url (text)
- role (enum: customer | agent | admin)
- phone (text)
- country_code (text)
- timezone (text)
- is_active (boolean)
- created_at / updated_at

### TicketCategories
- id (uuid, PK)
- name (text)
- description (text)
- color (text)
- is_active (boolean)
- created_at / updated_at

### SlaRules
- id (uuid, PK)
- priority (enum: low | medium | high)
- response_hours (integer)
- resolution_hours (integer)
- warning_threshold (integer, %)
- is_active (boolean)
- created_at / updated_at

### Tickets
- id (uuid, PK)
- ticket_number (serial)
- subject (text)
- description (text)
- status (enum: new | open | waiting_for_customer | resolved | closed)
- priority (enum: low | medium | high)
- category_id (uuid, FK → TicketCategories)
- customer_id (uuid, FK → UserProfiles)
- assigned_agent_id (uuid, FK → UserProfiles, nullable)
- country_code (text)
- sla_due_at (timestamptz)
- sla_breached (boolean)
- first_response_at (timestamptz)
- resolved_at (timestamptz)
- closed_at (timestamptz)
- created_at / updated_at

### TicketMessages
- id (uuid, PK)
- ticket_id (uuid, FK → Tickets)
- sender_id (uuid, FK → UserProfiles)
- content (text)
- is_internal (boolean, false for customer-visible)
- created_at

### TicketInternalNotes
- id (uuid, PK)
- ticket_id (uuid, FK → Tickets)
- author_id (uuid, FK → UserProfiles)
- content (text)
- created_at / updated_at

### TicketAttachments
- id (uuid, PK)
- ticket_id (uuid, FK → Tickets)
- message_id (uuid, FK → TicketMessages, nullable)
- uploaded_by (uuid, FK → UserProfiles)
- file_name (text)
- file_url (text)
- file_size (integer)
- mime_type (text)
- created_at

### TicketAssignments (history log)
- id (uuid, PK)
- ticket_id (uuid, FK → Tickets)
- assigned_from (uuid, FK → UserProfiles, nullable)
- assigned_to (uuid, FK → UserProfiles)
- assigned_by (uuid, FK → UserProfiles)
- created_at

### CountryInfoCache
- country_code (text, PK)
- name (text)
- flag_emoji (text)
- flag_url (text)
- currency_code (text)
- currency_name (text)
- calling_code (text)
- region (text)
- subregion (text)
- language (text)
- cached_at (timestamptz)

### EmailLogs
- id (uuid, PK)
- ticket_id (uuid, FK → Tickets, nullable)
- recipient_email (text)
- recipient_name (text)
- subject (text)
- template_type (text)
- status (enum: sent | failed | bounced)
- resend_message_id (text)
- error_message (text)
- sent_at (timestamptz)
- created_at

### AutomationJobs
- id (uuid, PK)
- job_type (text)
- status (enum: running | completed | failed)
- tickets_processed (integer)
- actions_taken (integer)
- error_message (text)
- started_at (timestamptz)
- completed_at (timestamptz)
- created_at

### AuditLogs
- id (uuid, PK)
- user_id (uuid, FK → UserProfiles)
- action (text)
- entity_type (text)
- entity_id (uuid)
- old_values (jsonb)
- new_values (jsonb)
- ip_address (text)
- created_at

---

## 2. Folder Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (customer)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── tickets/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── profile/page.tsx
│   │   └── notifications/page.tsx
│   ├── (agent)/
│   │   ├── layout.tsx
│   │   ├── agent/dashboard/page.tsx
│   │   ├── agent/queue/page.tsx
│   │   ├── agent/assigned/page.tsx
│   │   └── agent/tickets/[id]/page.tsx
│   ├── (admin)/
│   │   ├── layout.tsx
│   │   ├── admin/dashboard/page.tsx
│   │   ├── admin/users/page.tsx
│   │   ├── admin/agents/page.tsx
│   │   ├── admin/categories/page.tsx
│   │   ├── admin/sla/page.tsx
│   │   ├── admin/email-logs/page.tsx
│   │   ├── admin/automation-logs/page.tsx
│   │   ├── admin/audit-logs/page.tsx
│   │   ├── admin/analytics/page.tsx
│   │   └── admin/settings/page.tsx
│   └── api/
│       ├── health/route.ts
│       ├── tickets/route.ts
│       ├── tickets/[id]/route.ts
│       ├── categories/route.ts
│       ├── sla/route.ts
│       ├── email-logs/route.ts
│       ├── automation/route.ts
│       └── cron/sla-check/route.ts
├── components/
│   ├── ui/ (shadcn)
│   ├── auth/
│   ├── tickets/
│   ├── dashboard/
│   ├── admin/
│   └── shared/
├── lib/
│   ├── supabase/client.ts
│   ├── supabase/server.ts
│   ├── supabase/middleware.ts
│   ├── email/resend.ts
│   ├── email/templates.ts
│   ├── sla/calculator.ts
│   ├── countries/api.ts
│   └── utils.ts
└── types/
    └── index.ts
```

---

## 3. Page Map

| Path | Role | Description |
|------|------|-------------|
| /login | Public | Login form |
| /signup | Public | Registration |
| /forgot-password | Public | Request reset |
| /reset-password | Public | Set new password |
| /dashboard | Customer | Overview + stats |
| /tickets | Customer | List own tickets |
| /tickets/new | Customer | Create ticket |
| /tickets/[id] | Customer | View/reply ticket |
| /profile | Customer | Edit profile |
| /notifications | Customer | Notification center |
| /agent/dashboard | Agent | Queue summary |
| /agent/queue | Agent | Unassigned tickets |
| /agent/assigned | Agent | My assigned tickets |
| /agent/tickets/[id] | Agent | Ticket detail + notes |
| /admin/dashboard | Admin | Platform overview |
| /admin/users | Admin | Manage all users |
| /admin/agents | Admin | Manage agents |
| /admin/categories | Admin | Ticket categories |
| /admin/sla | Admin | SLA rules |
| /admin/email-logs | Admin | Email audit trail |
| /admin/automation-logs | Admin | Cron job history |
| /admin/audit-logs | Admin | System audit trail |
| /admin/analytics | Admin | Full analytics |
| /admin/settings | Admin | Platform settings |

---

## 4. API Map

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/health | Public | Health check |
| GET | /api/tickets | Auth | List tickets (role-filtered) |
| POST | /api/tickets | Customer | Create ticket |
| GET | /api/tickets/[id] | Auth | Get ticket |
| PATCH | /api/tickets/[id] | Auth | Update ticket |
| DELETE | /api/tickets/[id] | Admin | Delete ticket |
| POST | /api/tickets/[id]/messages | Auth | Add message |
| POST | /api/tickets/[id]/notes | Agent/Admin | Internal note |
| POST | /api/tickets/[id]/assign | Agent/Admin | Assign ticket |
| POST | /api/tickets/[id]/attachments | Auth | Upload attachment |
| GET | /api/categories | Auth | List categories |
| POST | /api/categories | Admin | Create category |
| PATCH | /api/categories/[id] | Admin | Update category |
| GET | /api/sla | Admin | List SLA rules |
| POST | /api/sla | Admin | Create SLA rule |
| PATCH | /api/sla/[id] | Admin | Update SLA rule |
| GET | /api/email-logs | Admin | List email logs |
| GET | /api/automation | Admin | List automation jobs |
| POST | /api/cron/sla-check | Cron | Run SLA automation |

---

## 5. Role Matrix

| Feature | Customer | Agent | Admin |
|---------|----------|-------|-------|
| Create ticket | ✓ | ✓ | ✓ |
| View own tickets | ✓ | - | ✓ |
| View all tickets | - | ✓ | ✓ |
| Reply to ticket | ✓ | ✓ | ✓ |
| Close own ticket | ✓ | - | ✓ |
| Change ticket status | - | ✓ | ✓ |
| Assign ticket | - | ✓ | ✓ |
| Internal notes | - | ✓ | ✓ |
| Upload attachments | ✓ | ✓ | ✓ |
| View email history | - | ✓ | ✓ |
| Manage users | - | - | ✓ |
| Manage categories | - | - | ✓ |
| Manage SLA rules | - | - | ✓ |
| View analytics | - | - | ✓ |
| View audit logs | - | - | ✓ |

---

## 6. Email Workflow

1. **Ticket Created** → Customer receives confirmation, assigned agent notified
2. **Agent Reply** → Customer notified with reply content
3. **Status Change** → Customer notified of new status
4. **SLA Warning** → Agent + Admin notified at 80% threshold
5. **SLA Breach** → Agent + Admin notified immediately
6. **Ticket Closed** → Customer receives closure notification with summary

All emails logged to EmailLogs table with resend_message_id for tracking.

---

## 7. SLA Workflow

- **Low Priority**: 48h response, 120h resolution
- **Medium Priority**: 8h response, 24h resolution  
- **High Priority**: 2h response, 8h resolution

SLA timer starts at ticket creation.
Warning triggered at 80% of time elapsed.
Breach triggered when due_at < now().

Visual indicators:
- Green (< 60% elapsed)
- Orange (60-99% elapsed)
- Red (≥ 100% elapsed = breached)

---

## 8. Automation Workflow (Every 15 minutes via Vercel Cron)

1. Fetch all open/new tickets
2. For each ticket, calculate SLA status
3. If warning threshold hit → send warning email (once per ticket)
4. If breached → send breach email, escalate to admin
5. If resolved > 72h → auto-close ticket
6. Check for duplicate tickets (same customer, same subject within 1h)
7. Log all actions to AutomationJobs table
