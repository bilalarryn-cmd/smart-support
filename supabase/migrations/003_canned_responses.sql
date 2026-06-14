-- Canned responses table
CREATE TABLE IF NOT EXISTS canned_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE canned_responses ENABLE ROW LEVEL SECURITY;

-- Agents and admins can read
CREATE POLICY "agents_admins_can_read_canned" ON canned_responses
  FOR SELECT USING (get_user_role(auth.uid()) IN ('agent', 'admin'));

-- Only admins can insert/update/delete
CREATE POLICY "admins_can_manage_canned" ON canned_responses
  FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Seed default canned responses
INSERT INTO canned_responses (title, content, category) VALUES
(
  'Greeting',
  'Hi {{customer_name}},

Thank you for reaching out to our support team. I''m happy to help you with your request.

Could you please provide more details about the issue you''re experiencing?

Best regards,
{{agent_name}}',
  'general'
),
(
  'Request more information',
  'Hi {{customer_name}},

Thank you for contacting us. To better assist you, could you please provide the following information:

1. Steps to reproduce the issue
2. Any error messages you''ve received
3. Browser/device you''re using

Looking forward to your response.

Best regards,
{{agent_name}}',
  'general'
),
(
  'Issue resolved',
  'Hi {{customer_name}},

I''m pleased to let you know that your issue has been resolved.

Please try again and let me know if you experience any further issues. We''re always here to help!

Best regards,
{{agent_name}}',
  'resolution'
),
(
  'Escalating to specialist',
  'Hi {{customer_name}},

Thank you for your patience. Your case requires specialist attention, and I''m escalating it to our dedicated team.

You can expect to hear from them within 24 hours. In the meantime, feel free to reach out if you have any urgent concerns.

Best regards,
{{agent_name}}',
  'escalation'
),
(
  'Following up',
  'Hi {{customer_name}},

I''m following up on your support ticket to check if the issue has been resolved on your end.

Please let us know if you''re still experiencing the problem or if there''s anything else we can help you with.

Best regards,
{{agent_name}}',
  'follow-up'
),
(
  'Planned maintenance notice',
  'Hi {{customer_name}},

We''d like to inform you that we have a scheduled maintenance window. During this time, some services may be temporarily unavailable.

We apologize for any inconvenience this may cause and appreciate your understanding.

Best regards,
{{agent_name}}',
  'general'
),
(
  'Account verification required',
  'Hi {{customer_name}},

For security purposes, we need to verify your identity before we can make changes to your account.

Could you please provide your registered email address and answer your security question?

Best regards,
{{agent_name}}',
  'account'
),
(
  'Closing ticket — no response',
  'Hi {{customer_name}},

We''ve been unable to reach you regarding your support request. As we haven''t heard back from you, we will be closing this ticket.

If you still need assistance, please don''t hesitate to open a new ticket and we''ll be happy to help.

Best regards,
{{agent_name}}',
  'resolution'
);
