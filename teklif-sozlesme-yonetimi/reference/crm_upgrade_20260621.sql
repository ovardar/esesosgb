-- CRM upgrade script (2026-06-21)
-- Applies additive changes for status, needs options, task activity type,
-- contract versioning/payment metadata, and pricing matrix.

BEGIN;

-- 1) Lead status (DB-backed)
ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS lead_status TEXT NOT NULL DEFAULT 'Fırsat';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'crm_leads_lead_status_check'
  ) THEN
    ALTER TABLE public.crm_leads
      ADD CONSTRAINT crm_leads_lead_status_check
      CHECK (lead_status IN ('Fırsat','İşlemde','Kazanıldı','Kaybedildi','Askıda'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS crm_leads_status_idx ON public.crm_leads(lead_status);

-- 2) Needs additions
ALTER TABLE public.crm_needs
  ADD COLUMN IF NOT EXISTS needs_hospital_screening BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS needs_mobile_screening BOOLEAN DEFAULT FALSE;

-- 3) Task activity type
ALTER TABLE public.crm_tasks
  ADD COLUMN IF NOT EXISTS activity_type TEXT NOT NULL DEFAULT 'Not';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'crm_tasks_activity_type_check'
  ) THEN
    ALTER TABLE public.crm_tasks
      ADD CONSTRAINT crm_tasks_activity_type_check
      CHECK (activity_type IN ('Telefon','Toplantı','E-posta','WhatsApp','Not','Ziyaret'));
  END IF;
END $$;

-- 4) Contract versioning + payment metadata
ALTER TABLE public.crm_contracts
  ADD COLUMN IF NOT EXISTS contract_no TEXT,
  ADD COLUMN IF NOT EXISTS version INTEGER,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS billing_target TEXT;

UPDATE public.crm_contracts
SET contract_no = COALESCE(contract_no, 'SOZ-' || to_char(COALESCE(created_at, NOW()), 'YYYY') || '-' || lpad((floor(random()*9000)+1000)::text, 4, '0')),
    version = COALESCE(version, 1),
    payment_method = COALESCE(payment_method, 'Taksitli'),
    billing_target = COALESCE(billing_target, 'Firmaya');

ALTER TABLE public.crm_contracts
  ALTER COLUMN contract_no SET NOT NULL,
  ALTER COLUMN version SET NOT NULL,
  ALTER COLUMN version SET DEFAULT 1,
  ALTER COLUMN payment_method SET DEFAULT 'Taksitli',
  ALTER COLUMN billing_target SET DEFAULT 'Firmaya';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'crm_contracts_payment_method_check'
  ) THEN
    ALTER TABLE public.crm_contracts
      ADD CONSTRAINT crm_contracts_payment_method_check
      CHECK (payment_method IN ('Taksitli','Nakit','Elden','Dönem Başı','Dönem Sonu'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'crm_contracts_billing_target_check'
  ) THEN
    ALTER TABLE public.crm_contracts
      ADD CONSTRAINT crm_contracts_billing_target_check
      CHECK (billing_target IN ('Firmaya','Bağlı OSGB''ye'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS crm_contracts_no_version_idx
  ON public.crm_contracts(tenant_id, contract_no, version);

-- 5) Price matrix table
CREATE TABLE IF NOT EXISTS public.crm_price_matrix (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  danger_class TEXT NOT NULL CHECK (danger_class IN ('Az Tehlikeli','Tehlikeli','Çok Tehlikeli')),
  min_emp      INTEGER NOT NULL DEFAULT 1,
  max_emp      INTEGER,
  uzman_unit   NUMERIC(12,2) NOT NULL DEFAULT 0,
  hekim_unit   NUMERIC(12,2) NOT NULL DEFAULT 0,
  dsp_unit     NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_price_matrix_tenant_id_idx ON public.crm_price_matrix(tenant_id);
CREATE INDEX IF NOT EXISTS crm_price_matrix_danger_idx ON public.crm_price_matrix(danger_class);

ALTER TABLE public.crm_price_matrix ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'crm_price_matrix' AND policyname = 'crm_price_matrix_select'
  ) THEN
    CREATE POLICY crm_price_matrix_select ON public.crm_price_matrix FOR SELECT
      USING (tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('admin', 'manager', 'sales', 'staff'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'crm_price_matrix' AND policyname = 'crm_price_matrix_insert'
  ) THEN
    CREATE POLICY crm_price_matrix_insert ON public.crm_price_matrix FOR INSERT
      WITH CHECK (tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('admin', 'manager', 'sales'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'crm_price_matrix' AND policyname = 'crm_price_matrix_update'
  ) THEN
    CREATE POLICY crm_price_matrix_update ON public.crm_price_matrix FOR UPDATE
      USING (tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('admin', 'manager', 'sales'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'crm_price_matrix' AND policyname = 'crm_price_matrix_delete'
  ) THEN
    CREATE POLICY crm_price_matrix_delete ON public.crm_price_matrix FOR DELETE
      USING (tenant_id = public.get_user_tenant_id()
        AND public.get_user_role() IN ('admin', 'manager'));
  END IF;
END $$;

COMMIT;
