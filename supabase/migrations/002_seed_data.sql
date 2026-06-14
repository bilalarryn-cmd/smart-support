-- ============================================================
-- Seed Data for Smart Support Platform
-- ============================================================

-- Default SLA Rules
INSERT INTO sla_rules (priority, response_hours, resolution_hours, warning_threshold, is_active)
VALUES
  ('low', 48, 120, 80, true),
  ('medium', 8, 24, 80, true),
  ('high', 2, 8, 80, true)
ON CONFLICT (priority) DO NOTHING;

-- Default Ticket Categories
INSERT INTO ticket_categories (name, description, color, is_active)
VALUES
  ('Technical Support', 'Issues with technical functionality or bugs', '#3B82F6', true),
  ('Billing & Payments', 'Questions about invoices, payments, or subscriptions', '#10B981', true),
  ('Account Management', 'Account access, settings, or profile issues', '#8B5CF6', true),
  ('Feature Request', 'Suggestions for new features or improvements', '#F59E0B', true),
  ('General Inquiry', 'General questions or information requests', '#6B7280', true),
  ('Bug Report', 'Reporting unexpected behavior or errors', '#EF4444', true),
  ('Sales', 'Pre-sales questions or upgrade inquiries', '#EC4899', true),
  ('Onboarding', 'Help getting started with the platform', '#14B8A6', true)
ON CONFLICT DO NOTHING;

-- Country Info Seed (common countries)
INSERT INTO country_info_cache (country_code, name, flag_emoji, currency_code, currency_name, calling_code, region, subregion, language, cached_at)
VALUES
  ('US', 'United States', '🇺🇸', 'USD', 'United States Dollar', '+1', 'Americas', 'Northern America', 'English', NOW()),
  ('GB', 'United Kingdom', '🇬🇧', 'GBP', 'British Pound', '+44', 'Europe', 'Northern Europe', 'English', NOW()),
  ('CA', 'Canada', '🇨🇦', 'CAD', 'Canadian Dollar', '+1', 'Americas', 'Northern America', 'English', NOW()),
  ('AU', 'Australia', '🇦🇺', 'AUD', 'Australian Dollar', '+61', 'Oceania', 'Australia and New Zealand', 'English', NOW()),
  ('DE', 'Germany', '🇩🇪', 'EUR', 'Euro', '+49', 'Europe', 'Western Europe', 'German', NOW()),
  ('FR', 'France', '🇫🇷', 'EUR', 'Euro', '+33', 'Europe', 'Western Europe', 'French', NOW()),
  ('IN', 'India', '🇮🇳', 'INR', 'Indian Rupee', '+91', 'Asia', 'Southern Asia', 'Hindi', NOW()),
  ('PK', 'Pakistan', '🇵🇰', 'PKR', 'Pakistani Rupee', '+92', 'Asia', 'Southern Asia', 'Urdu', NOW()),
  ('JP', 'Japan', '🇯🇵', 'JPY', 'Japanese Yen', '+81', 'Asia', 'Eastern Asia', 'Japanese', NOW()),
  ('BR', 'Brazil', '🇧🇷', 'BRL', 'Brazilian Real', '+55', 'Americas', 'South America', 'Portuguese', NOW()),
  ('MX', 'Mexico', '🇲🇽', 'MXN', 'Mexican Peso', '+52', 'Americas', 'Central America', 'Spanish', NOW()),
  ('NG', 'Nigeria', '🇳🇬', 'NGN', 'Nigerian Naira', '+234', 'Africa', 'Western Africa', 'English', NOW()),
  ('ZA', 'South Africa', '🇿🇦', 'ZAR', 'South African Rand', '+27', 'Africa', 'Southern Africa', 'Zulu', NOW()),
  ('SG', 'Singapore', '🇸🇬', 'SGD', 'Singapore Dollar', '+65', 'Asia', 'South-Eastern Asia', 'English', NOW()),
  ('AE', 'United Arab Emirates', '🇦🇪', 'AED', 'UAE Dirham', '+971', 'Asia', 'Western Asia', 'Arabic', NOW())
ON CONFLICT (country_code) DO NOTHING;
