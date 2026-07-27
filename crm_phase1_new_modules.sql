-- ============================================================
-- OSGB SaaS — Aşama 1: Yeni Modüller (Kimyasal, Acil Durum, Doküman, Saha Denetimi)
-- ============================================================

-- Otomatik updated_at trigger fonksiyonu (Eğer sistemde yoksa diye ekleniyor)
CREATE OR REPLACE FUNCTION public.crm_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- ============================================================
-- 1. chemicals (Kimyasal Yönetimi)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chemicals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id            UUID NOT NULL, -- references customer_companies.id
  name                  TEXT NOT NULL,
  cas_no                TEXT,
  hazard_class          TEXT,
  storage_area          TEXT,
  max_amount            TEXT,
  exposure_limit        TEXT,
  msds_url              TEXT,
  notes                 TEXT,
  created_by            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chemicals_tenant_id_idx ON public.chemicals(tenant_id);
CREATE INDEX IF NOT EXISTS chemicals_company_id_idx ON public.chemicals(company_id);

CREATE OR REPLACE TRIGGER chemicals_updated_at
  BEFORE UPDATE ON public.chemicals
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

ALTER TABLE public.chemicals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chemicals_select" ON public.chemicals FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "chemicals_insert" ON public.chemicals FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'super_admin', 'uzman', 'hekim'));

CREATE POLICY "chemicals_update" ON public.chemicals FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'super_admin', 'uzman', 'hekim'));

CREATE POLICY "chemicals_delete" ON public.chemicals FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'super_admin'));


-- ============================================================
-- 2. emergencies (Acil Durum Yönetimi)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.emergencies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id            UUID NOT NULL,
  emergency_type        TEXT NOT NULL,
  assembly_point        TEXT,
  drill_date            DATE,
  drill_status          TEXT,
  notes                 TEXT,
  created_by            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS emergencies_tenant_id_idx ON public.emergencies(tenant_id);
CREATE INDEX IF NOT EXISTS emergencies_company_id_idx ON public.emergencies(company_id);

CREATE OR REPLACE TRIGGER emergencies_updated_at
  BEFORE UPDATE ON public.emergencies
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "emergencies_select" ON public.emergencies FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "emergencies_insert" ON public.emergencies FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'super_admin', 'uzman', 'hekim'));

CREATE POLICY "emergencies_update" ON public.emergencies FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'super_admin', 'uzman', 'hekim'));

CREATE POLICY "emergencies_delete" ON public.emergencies FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'super_admin'));


-- ============================================================
-- 3. documents (Merkezi Doküman Yönetimi)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id            UUID NOT NULL,
  title                 TEXT NOT NULL,
  doc_type              TEXT NOT NULL,
  version               TEXT DEFAULT '1.0',
  file_url              TEXT,
  status                TEXT DEFAULT 'Aktif',
  notes                 TEXT,
  created_by            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_tenant_id_idx ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS documents_company_id_idx ON public.documents(company_id);

CREATE OR REPLACE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select" ON public.documents FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "documents_insert" ON public.documents FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'super_admin', 'uzman', 'hekim'));

CREATE POLICY "documents_update" ON public.documents FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'super_admin', 'uzman', 'hekim'));

CREATE POLICY "documents_delete" ON public.documents FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'super_admin'));


-- ============================================================
-- 4. inspections (Saha Denetimi / Checklist)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inspections (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id            UUID NOT NULL,
  inspector_id          UUID, -- staff id
  inspection_date       DATE NOT NULL,
  status                TEXT DEFAULT 'Taslak',
  location              TEXT,
  score                 NUMERIC,
  findings              JSONB DEFAULT '[]'::jsonb,
  notes                 TEXT,
  created_by            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inspections_tenant_id_idx ON public.inspections(tenant_id);
CREATE INDEX IF NOT EXISTS inspections_company_id_idx ON public.inspections(company_id);

CREATE OR REPLACE TRIGGER inspections_updated_at
  BEFORE UPDATE ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inspections_select" ON public.inspections FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "inspections_insert" ON public.inspections FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'super_admin', 'uzman', 'hekim'));

CREATE POLICY "inspections_update" ON public.inspections FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'super_admin', 'uzman', 'hekim'));

CREATE POLICY "inspections_delete" ON public.inspections FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role() IN ('admin', 'super_admin'));
