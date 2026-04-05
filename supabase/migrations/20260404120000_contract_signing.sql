-- ============================================================
-- MIGRATION: Sistema de firma electronica de contratos
-- Agrega campos de firma a contract_investors,
-- tabla de codigos de verificacion y templates de contratos
-- ============================================================

-- 1. Agregar campos de firma a contract_investors
ALTER TABLE public.contract_investors
  ADD COLUMN signature_name text,
  ADD COLUMN signature_cedula text,
  ADD COLUMN signature_ip text,
  ADD COLUMN signature_user_agent text,
  ADD COLUMN signed_at timestamptz;

-- 2. Tabla de codigos de verificacion (OTP para firma)
CREATE TABLE public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_investor_id uuid NOT NULL REFERENCES public.contract_investors(id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Tabla de templates de contratos
CREATE TABLE public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.investment_plans(id),
  name text NOT NULL,
  version int NOT NULL DEFAULT 1,
  content text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Habilitar RLS en las nuevas tablas
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- 5. Politicas RLS: acceso completo para service_role
CREATE POLICY "service_role_full_access" ON public.verification_codes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service_role_full_access" ON public.contract_templates
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 6. Indices
-- Busqueda de codigos no usados por contract_investor_id
CREATE INDEX idx_verification_codes_active
  ON public.verification_codes (contract_investor_id)
  WHERE NOT used;

-- Busqueda de templates activos por plan_id
CREATE INDEX idx_contract_templates_active
  ON public.contract_templates (plan_id)
  WHERE active;
