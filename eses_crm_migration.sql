-- ============================================================
-- ESES CRM Pipeline (Backoffice) schema
-- Bu scripti Supabase SQL Editor'de calistirin.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.eses_crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  owner_name TEXT,
  estimated_value TEXT,
  source TEXT,
  next_step TEXT,
  next_step_date DATE,
  stage TEXT NOT NULL DEFAULT 'Yeni Talep' CHECK (stage IN (
    'Yeni Talep',
    'Keşif / Demo',
    'Teklif',
    'Müzakere',
    'Kazanıldı',
    'Kaybedildi'
  )),
  note TEXT,
  target_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS eses_crm_deals_stage_idx ON public.eses_crm_deals(stage);
CREATE INDEX IF NOT EXISTS eses_crm_deals_updated_at_idx ON public.eses_crm_deals(updated_at DESC);
CREATE INDEX IF NOT EXISTS eses_crm_deals_target_tenant_idx ON public.eses_crm_deals(target_tenant_id);

CREATE OR REPLACE FUNCTION public.eses_crm_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS eses_crm_deals_updated_at ON public.eses_crm_deals;
CREATE TRIGGER eses_crm_deals_updated_at
  BEFORE UPDATE ON public.eses_crm_deals
  FOR EACH ROW EXECUTE FUNCTION public.eses_crm_set_updated_at();

ALTER TABLE public.eses_crm_deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eses_crm_deals_select" ON public.eses_crm_deals;
DROP POLICY IF EXISTS "eses_crm_deals_insert" ON public.eses_crm_deals;
DROP POLICY IF EXISTS "eses_crm_deals_update" ON public.eses_crm_deals;
DROP POLICY IF EXISTS "eses_crm_deals_delete" ON public.eses_crm_deals;

CREATE POLICY "eses_crm_deals_select" ON public.eses_crm_deals FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.osgb_staff s
      WHERE s.email = auth.email()
        AND s.access_role = 'super_admin'
    )
  );

CREATE POLICY "eses_crm_deals_insert" ON public.eses_crm_deals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.osgb_staff s
      WHERE s.email = auth.email()
        AND s.access_role = 'super_admin'
    )
  );

CREATE POLICY "eses_crm_deals_update" ON public.eses_crm_deals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.osgb_staff s
      WHERE s.email = auth.email()
        AND s.access_role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.osgb_staff s
      WHERE s.email = auth.email()
        AND s.access_role = 'super_admin'
    )
  );

CREATE POLICY "eses_crm_deals_delete" ON public.eses_crm_deals FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.osgb_staff s
      WHERE s.email = auth.email()
        AND s.access_role = 'super_admin'
    )
  );

NOTIFY pgrst, 'reload schema';
