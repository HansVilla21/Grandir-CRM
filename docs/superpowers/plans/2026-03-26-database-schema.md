# Database Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the complete PostgreSQL schema for Grandir CRM in Supabase — 16 tables, 12 enums, RLS policies, indexes, and seed data.

**Architecture:** Migrations applied sequentially via Supabase MCP. Each migration is a self-contained SQL file. RLS policies restrict access by role (admin/assistant/portal). Audit log captures all mutations with old/new data diff.

**Tech Stack:** PostgreSQL 17 (Supabase), SQL migrations, Row Level Security, Supabase Auth (`auth.users`)

**Spec:** `docs/superpowers/specs/2026-03-26-database-schema-design.md`

---

## File Structure

All files are Supabase migrations applied via MCP:

```
supabase/migrations/
├── 20260326170000_create_enums.sql
├── 20260326170100_create_user_profiles.sql
├── 20260326170200_create_investors.sql
├── 20260326170300_create_investor_emails.sql
├── 20260326170400_create_investment_plans.sql
├── 20260326170500_create_contracts.sql
├── 20260326170600_create_contract_investors.sql
├── 20260326170700_create_beneficiaries.sql
├── 20260326170800_create_contract_beneficiaries.sql
├── 20260326170900_create_payments.sql
├── 20260326171000_create_contract_documents.sql
├── 20260326171100_create_reports.sql
├── 20260326171200_create_notifications.sql
├── 20260326171300_create_bulletins.sql
├── 20260326171400_create_referral_commissions.sql
├── 20260326171500_create_audit_logs.sql
├── 20260326171600_create_rls_policies.sql
├── 20260326171700_create_indexes.sql
├── 20260326171800_create_storage_buckets.sql
└── 20260326171900_seed_plans.sql
```

---

### Task 1: Create PostgreSQL Enums

**Files:**
- Create: `supabase/migrations/20260326170000_create_enums.sql`

- [ ] **Step 1: Apply migration with all enums**

```sql
-- Enums for Grandir CRM

CREATE TYPE investor_status AS ENUM ('active', 'inactive');
CREATE TYPE plan_type AS ENUM ('annual', 'monthly', 'semestral');
CREATE TYPE contract_status AS ENUM ('draft', 'pending_approval', 'revision_requested', 'active', 'expired', 'cancelled');
CREATE TYPE contract_investor_role AS ENUM ('holder', 'co_investor');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'revision_requested');
CREATE TYPE payment_type AS ENUM ('deposit', 'withdrawal', 'commission');
CREATE TYPE document_type AS ENUM ('draft', 'signed_contract', 'deposit_receipt', 'disbursement_receipt', 'report', 'addendum');
CREATE TYPE report_status AS ENUM ('pending', 'generated', 'sent');
CREATE TYPE notification_type AS ENUM ('approval', 'revision_request', 'new_application', 'report_due', 'contract_expiring', 'disbursement_due', 'process_delayed');
CREATE TYPE notification_channel AS ENUM ('internal', 'email', 'both');
CREATE TYPE bulletin_target AS ENUM ('all_active', 'all_inactive', 'by_plan', 'custom');
CREATE TYPE bulletin_status AS ENUM ('draft', 'sent');
CREATE TYPE user_role AS ENUM ('admin', 'assistant');
```

Apply via: `mcp__claude_ai_Supabase__apply_migration` with name `create_enums`

- [ ] **Step 2: Verify enums exist**

```sql
SELECT typname FROM pg_type WHERE typtype = 'e' ORDER BY typname;
```

Expected: 13 rows — all enum names listed above.

---

### Task 2: Create `user_profiles` Table

**Files:**
- Create: `supabase/migrations/20260326170100_create_user_profiles.sql`

- [ ] **Step 1: Apply migration**

```sql
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role user_role NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE user_profiles IS 'Extended profile for internal team members (admin/assistant)';
```

Apply via: `mcp__claude_ai_Supabase__apply_migration` with name `create_user_profiles`

- [ ] **Step 2: Verify table exists**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;
```

Expected: 6 columns — id, full_name, role, active, created_at, updated_at.

---

### Task 3: Create `investors` Table

**Files:**
- Create: `supabase/migrations/20260326170200_create_investors.sql`

- [ ] **Step 1: Apply migration**

```sql
CREATE TABLE investors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  cedula text UNIQUE NOT NULL,
  phone text,
  status investor_status NOT NULL DEFAULT 'inactive',
  referrer_id uuid REFERENCES investors(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE investors ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE investors IS 'External investors who invest in the fund';
COMMENT ON COLUMN investors.cedula IS 'Costa Rican identity document, unique per investor';
COMMENT ON COLUMN investors.referrer_id IS 'Self-referencing FK to the investor who referred this person';
```

Apply via: `mcp__claude_ai_Supabase__apply_migration` with name `create_investors`

- [ ] **Step 2: Verify table and self-referencing FK**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'investors'
ORDER BY ordinal_position;
```

Expected: 8 columns. `cedula` has a unique constraint. `referrer_id` is nullable.

---

### Task 4: Create `investor_emails` Table

**Files:**
- Create: `supabase/migrations/20260326170300_create_investor_emails.sql`

- [ ] **Step 1: Apply migration**

```sql
CREATE TABLE investor_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  email text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_investor_email UNIQUE (investor_id, email)
);

ALTER TABLE investor_emails ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE investor_emails IS 'Multiple emails per investor, one marked as primary';
```

Apply via: `mcp__claude_ai_Supabase__apply_migration` with name `create_investor_emails`

- [ ] **Step 2: Verify table and unique constraint**

```sql
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'investor_emails'::regclass;
```

Expected: PK constraint + `uq_investor_email` unique constraint.

---

### Task 5: Create `investment_plans` Table

**Files:**
- Create: `supabase/migrations/20260326170400_create_investment_plans.sql`

- [ ] **Step 1: Apply migration**

```sql
CREATE TABLE investment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type plan_type NOT NULL,
  min_amount numeric(12,2) NOT NULL,
  annual_rate numeric(5,2) NOT NULL,
  payment_structure jsonb NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  valid_from date,
  valid_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE investment_plans ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE investment_plans IS 'Configurable investment plans with rates and payment rules';
COMMENT ON COLUMN investment_plans.annual_rate IS 'Annual return percentage, e.g. 120.00 = 120%';
COMMENT ON COLUMN investment_plans.payment_structure IS 'JSON describing payment timing and amounts per plan type';
```

Apply via: `mcp__claude_ai_Supabase__apply_migration` with name `create_investment_plans`

- [ ] **Step 2: Verify table**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'investment_plans'
ORDER BY ordinal_position;
```

Expected: 12 columns including `payment_structure` as jsonb.

---

### Task 6: Create `contracts` Table

**Files:**
- Create: `supabase/migrations/20260326170500_create_contracts.sql`

- [ ] **Step 1: Apply migration**

```sql
CREATE TABLE contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES investment_plans(id),
  amount numeric(12,2) NOT NULL,
  status contract_status NOT NULL DEFAULT 'draft',
  start_date date,
  end_date date,
  term_months integer NOT NULL CHECK (term_months > 0 AND term_months <= 48),
  report_frequency_months integer NOT NULL DEFAULT 2,
  version integer NOT NULL DEFAULT 1,
  parent_contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE contracts IS 'Investment contracts linking investors to plans';
COMMENT ON COLUMN contracts.term_months IS 'Contract duration in months, max 48 (4 years)';
COMMENT ON COLUMN contracts.parent_contract_id IS 'Self-ref for addendums/versions of existing contracts';
```

Apply via: `mcp__claude_ai_Supabase__apply_migration` with name `create_contracts`

- [ ] **Step 2: Verify table and check constraint**

```sql
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'contracts'::regclass AND contype = 'c';
```

Expected: Check constraint on `term_months` with range 1-48.

---

### Task 7: Create `contract_investors` Table

**Files:**
- Create: `supabase/migrations/20260326170600_create_contract_investors.sql`

- [ ] **Step 1: Apply migration**

```sql
CREATE TABLE contract_investors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES investors(id),
  role contract_investor_role NOT NULL DEFAULT 'holder',
  portal_token text UNIQUE,
  token_expires_at timestamptz,
  approval_status approval_status NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  revision_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_contract_investor UNIQUE (contract_id, investor_id)
);

ALTER TABLE contract_investors ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE contract_investors IS 'N:M relationship between contracts and investors, with portal access tokens';
COMMENT ON COLUMN contract_investors.portal_token IS 'Unique token for investor portal access per contract';
```

Apply via: `mcp__claude_ai_Supabase__apply_migration` with name `create_contract_investors`

- [ ] **Step 2: Verify table, unique constraints, and FKs**

```sql
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'contract_investors'::regclass;
```

Expected: PK + 2 unique constraints (`portal_token`, `uq_contract_investor`) + 2 FKs.

---

### Task 8: Create `beneficiaries` and `contract_beneficiaries` Tables

**Files:**
- Create: `supabase/migrations/20260326170700_create_beneficiaries.sql`
- Create: `supabase/migrations/20260326170800_create_contract_beneficiaries.sql`

- [ ] **Step 1: Apply beneficiaries migration**

```sql
CREATE TABLE beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  cedula text UNIQUE NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE beneficiaries IS 'Beneficiaries who can receive funds on behalf of investors';
```

Apply via: `mcp__claude_ai_Supabase__apply_migration` with name `create_beneficiaries`

- [ ] **Step 2: Apply contract_beneficiaries migration**

```sql
CREATE TABLE contract_beneficiaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  beneficiary_id uuid NOT NULL REFERENCES beneficiaries(id),
  percentage numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_contract_beneficiary UNIQUE (contract_id, beneficiary_id)
);

ALTER TABLE contract_beneficiaries ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE contract_beneficiaries IS 'N:M linking beneficiaries to contracts with percentage allocation';
```

Apply via: `mcp__claude_ai_Supabase__apply_migration` with name `create_contract_beneficiaries`

- [ ] **Step 3: Verify both tables**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('beneficiaries', 'contract_beneficiaries');
```

Expected: 2 rows.

---

### Task 9: Create `payments` Table

**Files:**
- Create: `supabase/migrations/20260326170900_create_payments.sql`

- [ ] **Step 1: Apply migration**

```sql
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id),
  type payment_type NOT NULL,
  amount numeric(12,2) NOT NULL,
  payment_date date NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  receipt_path text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE payments IS 'All financial movements: deposits, withdrawals, and commissions';
```

Apply via: `mcp__claude_ai_Supabase__apply_migration` with name `create_payments`

- [ ] **Step 2: Verify table**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'payments'
ORDER BY ordinal_position;
```

Expected: 12 columns.

---

### Task 10: Create `contract_documents` Table

**Files:**
- Create: `supabase/migrations/20260326171000_create_contract_documents.sql`

- [ ] **Step 1: Apply migration**

```sql
CREATE TABLE contract_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id),
  type document_type NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  mime_type text,
  version integer NOT NULL DEFAULT 1,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_by_portal uuid REFERENCES contract_investors(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE contract_documents IS 'All documents attached to a contract (PDFs, receipts, reports)';
COMMENT ON COLUMN contract_documents.uploaded_by IS 'Internal user who uploaded (NULL if uploaded via portal)';
COMMENT ON COLUMN contract_documents.uploaded_by_portal IS 'Investor portal relationship (NULL if uploaded by internal user)';
```

Apply via: `mcp__claude_ai_Supabase__apply_migration` with name `create_contract_documents`

- [ ] **Step 2: Verify table**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'contract_documents'
ORDER BY ordinal_position;
```

Expected: 11 columns.

---

### Task 11: Create `reports` Table

**Files:**
- Create: `supabase/migrations/20260326171100_create_reports.sql`

- [ ] **Step 1: Apply migration**

```sql
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  growth_rate numeric(5,2) NOT NULL,
  description text,
  calculated_amount numeric(12,2),
  pdf_path text,
  status report_status NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  sent_to text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE reports IS 'Periodic investment reports generated and sent to investors';
COMMENT ON COLUMN reports.calculated_amount IS 'Pre-calculated amount (growth_rate applied to capital) for historical consistency';
```

Apply via: `mcp__claude_ai_Supabase__apply_migration` with name `create_reports`

- [ ] **Step 2: Verify table**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'reports'
ORDER BY ordinal_position;
```

Expected: 13 columns.

---

### Task 12: Create `notifications` Table

**Files:**
- Create: `supabase/migrations/20260326171200_create_notifications.sql`

- [ ] **Step 1: Apply migration**

```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_type NOT NULL,
  title text NOT NULL,
  body text,
  channel notification_channel NOT NULL,
  contract_id uuid REFERENCES contracts(id),
  investor_id uuid REFERENCES investors(id),
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id),
  read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  email_sent boolean NOT NULL DEFAULT false,
  email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE notifications IS 'Internal and email notifications for system events';
```

Apply via: `mcp__claude_ai_Supabase__apply_migration` with name `create_notifications`

- [ ] **Step 2: Verify table**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;
```

Expected: 13 columns.

---

### Task 13: Create `bulletins` and `bulletin_recipients` Tables

**Files:**
- Create: `supabase/migrations/20260326171300_create_bulletins.sql`

- [ ] **Step 1: Apply migration**

```sql
CREATE TABLE bulletins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  target_group bulletin_target NOT NULL,
  target_plan_id uuid REFERENCES investment_plans(id),
  status bulletin_status NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  sent_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bulletin_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bulletin_id uuid NOT NULL REFERENCES bulletins(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES investors(id),
  email text NOT NULL,
  delivered boolean NOT NULL DEFAULT false,
  opened boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bulletins ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletin_recipients ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE bulletins IS 'Mass email communications to investor groups';
COMMENT ON TABLE bulletin_recipients IS 'Tracks delivery and open status per recipient';
```

Apply via: `mcp__claude_ai_Supabase__apply_migration` with name `create_bulletins`

- [ ] **Step 2: Verify both tables**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('bulletins', 'bulletin_recipients');
```

Expected: 2 rows.

---

### Task 14: Create `referral_commissions` Table

**Files:**
- Create: `supabase/migrations/20260326171400_create_referral_commissions.sql`

- [ ] **Step 1: Apply migration**

```sql
CREATE TABLE referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES investors(id),
  referred_id uuid NOT NULL REFERENCES investors(id),
  contract_id uuid NOT NULL REFERENCES contracts(id),
  amount numeric(12,2) NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  paid_at date,
  receipt_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE referral_commissions IS 'Commission tracking for investor referrals';
```

Apply via: `mcp__claude_ai_Supabase__apply_migration` with name `create_referral_commissions`

- [ ] **Step 2: Verify table**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'referral_commissions'
ORDER BY ordinal_position;
```

Expected: 9 columns.

---

### Task 15: Create `audit_logs` Table

**Files:**
- Create: `supabase/migrations/20260326171500_create_audit_logs.sql`

- [ ] **Step 1: Apply migration**

```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- No updated_at — audit logs are immutable
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE audit_logs IS 'Immutable audit trail with old/new data diff for all system mutations';
```

Apply via: `mcp__claude_ai_Supabase__apply_migration` with name `create_audit_logs`

- [ ] **Step 2: Verify table**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;
```

Expected: 10 columns. No `updated_at`.

---

### Task 16: Create RLS Policies

**Files:**
- Create: `supabase/migrations/20260326171600_create_rls_policies.sql`

- [ ] **Step 1: Apply migration with all RLS policies**

```sql
-- Helper function: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin' AND active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if current user is authenticated internal user
CREATE OR REPLACE FUNCTION is_internal_user()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- user_profiles
-- ============================================
CREATE POLICY "Admin full access on user_profiles"
  ON user_profiles FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- ============================================
-- investors
-- ============================================
CREATE POLICY "Admin full access on investors"
  ON investors FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Assistants can read investors"
  ON investors FOR SELECT
  USING (is_internal_user());

CREATE POLICY "Assistants can update investors"
  ON investors FOR UPDATE
  USING (is_internal_user())
  WITH CHECK (is_internal_user());

-- ============================================
-- investor_emails
-- ============================================
CREATE POLICY "Internal users full access on investor_emails"
  ON investor_emails FOR ALL
  USING (is_internal_user())
  WITH CHECK (is_internal_user());

-- ============================================
-- investment_plans
-- ============================================
CREATE POLICY "Admin full access on investment_plans"
  ON investment_plans FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Internal users can read plans"
  ON investment_plans FOR SELECT
  USING (is_internal_user());

-- ============================================
-- contracts
-- ============================================
CREATE POLICY "Admin full access on contracts"
  ON contracts FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Assistants can read contracts"
  ON contracts FOR SELECT
  USING (is_internal_user());

CREATE POLICY "Assistants can create draft contracts"
  ON contracts FOR INSERT
  WITH CHECK (is_internal_user() AND status = 'draft');

-- ============================================
-- contract_investors
-- ============================================
CREATE POLICY "Admin full access on contract_investors"
  ON contract_investors FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Assistants can read contract_investors"
  ON contract_investors FOR SELECT
  USING (is_internal_user());

-- ============================================
-- beneficiaries
-- ============================================
CREATE POLICY "Internal users full access on beneficiaries"
  ON beneficiaries FOR ALL
  USING (is_internal_user())
  WITH CHECK (is_internal_user());

-- ============================================
-- contract_beneficiaries
-- ============================================
CREATE POLICY "Internal users full access on contract_beneficiaries"
  ON contract_beneficiaries FOR ALL
  USING (is_internal_user())
  WITH CHECK (is_internal_user());

-- ============================================
-- payments
-- ============================================
CREATE POLICY "Admin full access on payments"
  ON payments FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Assistants can read payments"
  ON payments FOR SELECT
  USING (is_internal_user());

-- ============================================
-- contract_documents
-- ============================================
CREATE POLICY "Admin full access on contract_documents"
  ON contract_documents FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Assistants can read contract_documents"
  ON contract_documents FOR SELECT
  USING (is_internal_user());

-- ============================================
-- reports
-- ============================================
CREATE POLICY "Admin full access on reports"
  ON reports FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Assistants can read and create reports"
  ON reports FOR SELECT
  USING (is_internal_user());

CREATE POLICY "Assistants can insert reports"
  ON reports FOR INSERT
  WITH CHECK (is_internal_user());

-- ============================================
-- notifications
-- ============================================
CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT
  USING (recipient_user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

CREATE POLICY "Admin can manage all notifications"
  ON notifications FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- bulletins
-- ============================================
CREATE POLICY "Admin full access on bulletins"
  ON bulletins FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Internal users can read bulletins"
  ON bulletins FOR SELECT
  USING (is_internal_user());

-- ============================================
-- bulletin_recipients
-- ============================================
CREATE POLICY "Admin full access on bulletin_recipients"
  ON bulletin_recipients FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Internal users can read bulletin_recipients"
  ON bulletin_recipients FOR SELECT
  USING (is_internal_user());

-- ============================================
-- referral_commissions
-- ============================================
CREATE POLICY "Admin full access on referral_commissions"
  ON referral_commissions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Internal users can read referral_commissions"
  ON referral_commissions FOR SELECT
  USING (is_internal_user());

-- ============================================
-- audit_logs
-- ============================================
CREATE POLICY "Admin can read audit_logs"
  ON audit_logs FOR SELECT
  USING (is_admin());

CREATE POLICY "Internal users can insert audit_logs"
  ON audit_logs FOR INSERT
  WITH CHECK (is_internal_user());
```

Apply via: `mcp__claude_ai_Supabase__apply_migration` with name `create_rls_policies`

- [ ] **Step 2: Verify RLS is enabled on all tables**

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Expected: All 16 tables with `rowsecurity = true`.

- [ ] **Step 3: Verify policies count**

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Expected: ~30 policies across all tables.

---

### Task 17: Create Indexes

**Files:**
- Create: `supabase/migrations/20260326171700_create_indexes.sql`

- [ ] **Step 1: Apply migration**

```sql
-- Performance indexes for common queries
CREATE INDEX idx_investors_cedula ON investors(cedula);
CREATE INDEX idx_investors_status ON investors(status);
CREATE INDEX idx_investor_emails_investor ON investor_emails(investor_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_end_date ON contracts(end_date);
CREATE INDEX idx_contracts_plan ON contracts(plan_id);
CREATE INDEX idx_contract_investors_token ON contract_investors(portal_token);
CREATE INDEX idx_contract_investors_investor ON contract_investors(investor_id);
CREATE INDEX idx_contract_investors_contract ON contract_investors(contract_id);
CREATE INDEX idx_payments_contract ON payments(contract_id, payment_date);
CREATE INDEX idx_contract_documents_contract ON contract_documents(contract_id);
CREATE INDEX idx_reports_contract ON reports(contract_id, period_end);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_user_id, read, created_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at);
CREATE INDEX idx_referral_commissions_referrer ON referral_commissions(referrer_id);
CREATE INDEX idx_bulletin_recipients_bulletin ON bulletin_recipients(bulletin_id);
```

Apply via: `mcp__claude_ai_Supabase__apply_migration` with name `create_indexes`

- [ ] **Step 2: Verify indexes**

```sql
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
ORDER BY indexname;
```

Expected: 17 custom indexes.

---

### Task 18: Create Storage Buckets

**Files:**
- Create: `supabase/migrations/20260326171800_create_storage_buckets.sql`

- [ ] **Step 1: Apply migration**

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('contracts', 'contracts', false, 10485760, ARRAY['application/pdf']),
  ('receipts', 'receipts', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('reports', 'reports', false, 10485760, ARRAY['application/pdf']),
  ('commissions', 'commissions', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']);

-- Storage policies: only authenticated internal users can upload/read
CREATE POLICY "Internal users can upload to contracts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'contracts' AND auth.role() = 'authenticated');

CREATE POLICY "Internal users can read contracts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contracts' AND auth.role() = 'authenticated');

CREATE POLICY "Internal users can upload to receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Internal users can read receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts' AND auth.role() = 'authenticated');

CREATE POLICY "Internal users can upload to reports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'reports' AND auth.role() = 'authenticated');

CREATE POLICY "Internal users can read reports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reports' AND auth.role() = 'authenticated');

CREATE POLICY "Internal users can upload to commissions"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'commissions' AND auth.role() = 'authenticated');

CREATE POLICY "Internal users can read commissions"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'commissions' AND auth.role() = 'authenticated');
```

Apply via: `mcp__claude_ai_Supabase__apply_migration` with name `create_storage_buckets`

- [ ] **Step 2: Verify buckets**

```sql
SELECT id, name, public FROM storage.buckets ORDER BY name;
```

Expected: 4 buckets — all private (`public = false`).

---

### Task 19: Seed Investment Plans (2026)

**Files:**
- Create: `supabase/migrations/20260326171900_seed_plans.sql`

- [ ] **Step 1: Apply migration**

```sql
INSERT INTO investment_plans (name, type, min_amount, annual_rate, payment_structure, description, active, valid_from)
VALUES
  (
    'Plan Anual',
    'annual',
    1000.00,
    120.00,
    '{"type": "single_payment", "pay_at": "on_maturity"}'::jsonb,
    'Inversión mínima de $1,000. Rendimiento del 120% anual. Pago único al vencimiento.',
    true,
    '2026-01-01'
  ),
  (
    'Plan Mensual',
    'monthly',
    10000.00,
    125.00,
    '{"type": "monthly", "starts_at_month": 3, "monthly_rate": 10.0, "remainder": "on_maturity"}'::jsonb,
    'Inversión mínima de $10,000. Rendimiento del 125% anual. Pagos del 10% mensual desde el mes 3, resto al vencimiento.',
    true,
    '2026-01-01'
  ),
  (
    'Plan Semestral',
    'semestral',
    10000.00,
    135.00,
    '{"type": "semestral", "semestral_rate": 40.0, "remainder": "on_maturity"}'::jsonb,
    'Inversión mínima de $10,000. Rendimiento del 135% anual. Pagos del 40% semestral, resto al vencimiento.',
    true,
    '2026-01-01'
  );
```

Apply via: `mcp__claude_ai_Supabase__apply_migration` with name `seed_plans`

- [ ] **Step 2: Verify seed data**

```sql
SELECT name, type, min_amount, annual_rate, active FROM investment_plans ORDER BY min_amount;
```

Expected: 3 rows — Plan Anual ($1,000/120%), Plan Mensual ($10,000/125%), Plan Semestral ($10,000/135%).

---

### Task 20: Final Verification

- [ ] **Step 1: Count all tables**

```sql
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public';
```

Expected: 16 tables.

- [ ] **Step 2: Count all enums**

```sql
SELECT count(*) FROM pg_type WHERE typtype = 'e';
```

Expected: 13 enums.

- [ ] **Step 3: Verify RLS on all tables**

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
```

Expected: 0 rows (all tables have RLS enabled).

- [ ] **Step 4: Verify storage buckets**

```sql
SELECT count(*) FROM storage.buckets WHERE id IN ('contracts', 'receipts', 'reports', 'commissions');
```

Expected: 4.

- [ ] **Step 5: Verify seed data**

```sql
SELECT count(*) FROM investment_plans WHERE active = true;
```

Expected: 3.
