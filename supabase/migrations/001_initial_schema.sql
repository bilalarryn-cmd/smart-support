-- ============================================================
-- Smart Support Platform — Initial Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('customer', 'agent', 'admin');
CREATE TYPE ticket_status AS ENUM ('new', 'open', 'waiting_for_customer', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE email_status AS ENUM ('sent', 'failed', 'bounced');
CREATE TYPE automation_status AS ENUM ('running', 'completed', 'failed');

-- ============================================================
-- USER PROFILES
-- ============================================================

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  phone TEXT,
  country_code TEXT DEFAULT 'US',
  timezone TEXT DEFAULT 'UTC',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TICKET CATEGORIES
-- ============================================================

CREATE TABLE ticket_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SLA RULES
-- ============================================================

CREATE TABLE sla_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  priority ticket_priority NOT NULL UNIQUE,
  response_hours INTEGER NOT NULL,
  resolution_hours INTEGER NOT NULL,
  warning_threshold INTEGER NOT NULL DEFAULT 80,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TICKETS
-- ============================================================

CREATE SEQUENCE ticket_number_seq START 1000;

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number INTEGER NOT NULL DEFAULT nextval('ticket_number_seq'),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'new',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  category_id UUID REFERENCES ticket_categories(id),
  customer_id UUID NOT NULL REFERENCES user_profiles(id),
  assigned_agent_id UUID REFERENCES user_profiles(id),
  country_code TEXT DEFAULT 'US',
  sla_due_at TIMESTAMPTZ,
  sla_warned BOOLEAN NOT NULL DEFAULT false,
  sla_breached BOOLEAN NOT NULL DEFAULT false,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticket_number)
);

-- ============================================================
-- TICKET MESSAGES
-- ============================================================

CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES user_profiles(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TICKET INTERNAL NOTES
-- ============================================================

CREATE TABLE ticket_internal_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES user_profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TICKET ATTACHMENTS
-- ============================================================

CREATE TABLE ticket_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES ticket_messages(id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL REFERENCES user_profiles(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TICKET ASSIGNMENTS (history)
-- ============================================================

CREATE TABLE ticket_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  assigned_from UUID REFERENCES user_profiles(id),
  assigned_to UUID NOT NULL REFERENCES user_profiles(id),
  assigned_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COUNTRY INFO CACHE
-- ============================================================

CREATE TABLE country_info_cache (
  country_code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flag_emoji TEXT,
  flag_url TEXT,
  currency_code TEXT,
  currency_name TEXT,
  calling_code TEXT,
  region TEXT,
  subregion TEXT,
  language TEXT,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EMAIL LOGS
-- ============================================================

CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL,
  status email_status NOT NULL DEFAULT 'sent',
  resend_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUTOMATION JOBS
-- ============================================================

CREATE TABLE automation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type TEXT NOT NULL,
  status automation_status NOT NULL DEFAULT 'running',
  tickets_processed INTEGER NOT NULL DEFAULT 0,
  actions_taken INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_tickets_customer_id ON tickets(customer_id);
CREATE INDEX idx_tickets_assigned_agent_id ON tickets(assigned_agent_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_tickets_sla_due_at ON tickets(sla_due_at);
CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
CREATE INDEX idx_email_logs_ticket_id ON email_logs(ticket_id);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_automation_jobs_created_at ON automation_jobs(created_at DESC);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ticket_categories_updated_at
  BEFORE UPDATE ON ticket_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sla_rules_updated_at
  BEFORE UPDATE ON sla_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ticket_internal_notes_updated_at
  BEFORE UPDATE ON ticket_internal_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_info_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM user_profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- user_profiles policies
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid() OR get_user_role(auth.uid()) IN ('agent', 'admin'));

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid() OR get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (get_user_role(auth.uid()) = 'admin' OR auth.uid() = id);

-- tickets policies
CREATE POLICY "Customers see own tickets"
  ON tickets FOR SELECT
  USING (
    customer_id = auth.uid()
    OR get_user_role(auth.uid()) IN ('agent', 'admin')
  );

CREATE POLICY "Customers can create tickets"
  ON tickets FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update own tickets, agents/admins can update all"
  ON tickets FOR UPDATE
  USING (
    customer_id = auth.uid()
    OR get_user_role(auth.uid()) IN ('agent', 'admin')
  );

-- ticket_messages policies
CREATE POLICY "View messages for accessible tickets"
  ON ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t WHERE t.id = ticket_id AND (
        t.customer_id = auth.uid()
        OR get_user_role(auth.uid()) IN ('agent', 'admin')
      )
    )
    AND (is_internal = false OR get_user_role(auth.uid()) IN ('agent', 'admin'))
  );

CREATE POLICY "Insert messages for accessible tickets"
  ON ticket_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tickets t WHERE t.id = ticket_id AND (
        t.customer_id = auth.uid()
        OR get_user_role(auth.uid()) IN ('agent', 'admin')
      )
    )
  );

-- ticket_internal_notes policies
CREATE POLICY "Agents and admins can view internal notes"
  ON ticket_internal_notes FOR SELECT
  USING (get_user_role(auth.uid()) IN ('agent', 'admin'));

CREATE POLICY "Agents and admins can create internal notes"
  ON ticket_internal_notes FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND get_user_role(auth.uid()) IN ('agent', 'admin')
  );

CREATE POLICY "Authors can update their notes"
  ON ticket_internal_notes FOR UPDATE
  USING (author_id = auth.uid() OR get_user_role(auth.uid()) = 'admin');

-- ticket_attachments policies
CREATE POLICY "View attachments for accessible tickets"
  ON ticket_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t WHERE t.id = ticket_id AND (
        t.customer_id = auth.uid()
        OR get_user_role(auth.uid()) IN ('agent', 'admin')
      )
    )
  );

CREATE POLICY "Upload attachments for accessible tickets"
  ON ticket_attachments FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM tickets t WHERE t.id = ticket_id AND (
        t.customer_id = auth.uid()
        OR get_user_role(auth.uid()) IN ('agent', 'admin')
      )
    )
  );

-- ticket_assignments policies
CREATE POLICY "Agents and admins can view assignments"
  ON ticket_assignments FOR SELECT
  USING (get_user_role(auth.uid()) IN ('agent', 'admin'));

CREATE POLICY "Agents and admins can create assignments"
  ON ticket_assignments FOR INSERT
  WITH CHECK (get_user_role(auth.uid()) IN ('agent', 'admin'));

-- ticket_categories policies
CREATE POLICY "Everyone can view active categories"
  ON ticket_categories FOR SELECT
  USING (is_active = true OR get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Only admins can manage categories"
  ON ticket_categories FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

-- sla_rules policies
CREATE POLICY "Everyone can view active SLA rules"
  ON sla_rules FOR SELECT
  USING (is_active = true OR get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Only admins can manage SLA rules"
  ON sla_rules FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

-- country_info_cache policies
CREATE POLICY "Everyone can view country info"
  ON country_info_cache FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage country cache"
  ON country_info_cache FOR ALL
  USING (auth.uid() IS NOT NULL);

-- email_logs policies
CREATE POLICY "Only admins can view email logs"
  ON email_logs FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Service role can insert email logs"
  ON email_logs FOR INSERT
  WITH CHECK (true);

-- automation_jobs policies
CREATE POLICY "Only admins can view automation jobs"
  ON automation_jobs FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Service role can manage automation jobs"
  ON automation_jobs FOR ALL
  USING (true);

-- audit_logs policies
CREATE POLICY "Only admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);
