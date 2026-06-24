-- ============================================================
-- OSGB SaaS — CRM Modülü Eksik Kolon, Fonksiyon ve Tablo Düzeltme
-- Bu kodu Supabase SQL Editor'de yapıştırıp çalıştırın (Run)
-- ============================================================

-- ============================================================
-- 1. Yardımcı Fonksiyonları Oluştur / Güncelle
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT tenant_id
  FROM public.osgb_staff
  WHERE email = auth.email()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT 
    CASE 
      WHEN access_role = 'super_admin' THEN 'admin'
      ELSE access_role
    END
  FROM public.osgb_staff
  WHERE email = auth.email()
  LIMIT 1;
$$;

-- ============================================================
-- 2. Mevcut Tablolara Eksik Kolonları Ekle
-- ============================================================

-- crm_leads tablosuna eksik kolonları ekle
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS lost_reason TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS is_converted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS converted_company_id UUID REFERENCES public.customer_companies(id);
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS created_by TEXT;

-- crm_contacts tablosuna eksik kolonları ekle
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS is_invoice_contact BOOLEAN NOT NULL DEFAULT FALSE;

-- crm_activities tablosuna eksik kolonları ekle
ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS summary TEXT NOT NULL DEFAULT '';
ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS next_action TEXT;
ALTER TABLE public.crm_activities ADD COLUMN IF NOT EXISTS created_by TEXT;

-- crm_tasks tablosuna eksik kolonları ekle
ALTER TABLE public.crm_tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.crm_tasks ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE public.crm_tasks ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE public.crm_tasks ADD COLUMN IF NOT EXISTS created_by TEXT;

-- ============================================================
-- 3. Eksik Tabloları Oluştur
-- ============================================================

-- A. crm_needs — İhtiyaç Analizi
CREATE TABLE IF NOT EXISTS public.crm_needs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id                UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  location_count         INTEGER,
  shift_structure        TEXT,
  needs_hekim            BOOLEAN DEFAULT FALSE,
  needs_uzman            BOOLEAN DEFAULT FALSE,
  needs_dsp              BOOLEAN DEFAULT FALSE,
  needs_training         BOOLEAN DEFAULT FALSE,
  needs_risk_analysis    BOOLEAN DEFAULT FALSE,
  needs_emergency_plan   BOOLEAN DEFAULT FALSE,
  needs_periodic_exam    BOOLEAN DEFAULT FALSE,
  needs_env_measurement  BOOLEAN DEFAULT FALSE,
  existing_osgb          TEXT,
  current_contract_end   DATE,
  isg_katip_status       TEXT,
  uzman_class_needed     TEXT,
  hekim_hours_needed     INTEGER,
  dsp_needed             BOOLEAN DEFAULT FALSE,
  notes                  TEXT,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_needs_lead_unique ON public.crm_needs(lead_id);

ALTER TABLE public.crm_needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_needs_select" ON public.crm_needs FOR SELECT
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales', 'staff'));

CREATE POLICY "crm_needs_insert" ON public.crm_needs FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales'));

CREATE POLICY "crm_needs_update" ON public.crm_needs FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales'));

CREATE POLICY "crm_needs_delete" ON public.crm_needs FOR DELETE
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager'));


-- B. crm_offers — Teklifler (çoklu versiyon + PDF export)
CREATE TABLE IF NOT EXISTS public.crm_offers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id           UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  offer_no          TEXT NOT NULL,               -- Örn: TKL-2026-001
  version           INTEGER NOT NULL DEFAULT 1,
  offer_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until       DATE,
  employee_count    INTEGER,
  monthly_fee       NUMERIC(12,2),
  extra_services    JSONB DEFAULT '[]',           -- [{name, unit_price, qty, total}]
  discount          NUMERIC(5,2) DEFAULT 0,      -- %
  kdv_rate          NUMERIC(5,2) DEFAULT 20,     -- %
  subtotal          NUMERIC(12,2),               -- iskonto öncesi
  total_amount      NUMERIC(12,2),               -- KDV dahil genel toplam
  status            TEXT NOT NULL DEFAULT 'Hazırlandı'
                    CHECK (status IN (
                      'Hazırlandı','Gönderildi','Revize','Kabul Edildi','Red Edildi'
                    )),
  -- PDF Export alanları
  pdf_url           TEXT,                        -- Storage'da saklanan PDF yolu
  pdf_generated_at  TIMESTAMPTZ,                 -- Son PDF oluşturma zamanı
  pdf_generated_by  TEXT,                        -- Kim oluşturdu
  sent_at           TIMESTAMPTZ,                 -- Müşteriye gönderilme zamanı
  sent_by           TEXT,                        -- Kim gönderdi
  notes             TEXT,
  created_by        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_offers_lead_id_idx   ON public.crm_offers(lead_id);
CREATE INDEX IF NOT EXISTS crm_offers_tenant_id_idx ON public.crm_offers(tenant_id);
CREATE INDEX IF NOT EXISTS crm_offers_status_idx    ON public.crm_offers(status);
CREATE UNIQUE INDEX IF NOT EXISTS crm_offers_no_version_idx
  ON public.crm_offers(tenant_id, offer_no, version);

ALTER TABLE public.crm_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_offers_select" ON public.crm_offers FOR SELECT
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales', 'staff'));

CREATE POLICY "crm_offers_insert" ON public.crm_offers FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales'));

CREATE POLICY "crm_offers_update" ON public.crm_offers FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales'));

CREATE POLICY "crm_offers_delete" ON public.crm_offers FOR DELETE
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager'));


-- C. crm_contracts — Sözleşme Süreci
CREATE TABLE IF NOT EXISTS public.crm_contracts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id             UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  offer_id            UUID REFERENCES public.crm_offers(id),
  start_date          DATE,
  end_date            DATE,
  service_start_date  DATE,
  monthly_fee         NUMERIC(12,2),
  payment_period      TEXT DEFAULT 'Aylık'
                      CHECK (payment_period IN ('Aylık','3 Aylık','6 Aylık','Yıllık')),
  invoice_day         INTEGER CHECK (invoice_day BETWEEN 1 AND 31),
  file_url            TEXT,                      -- imzalı sözleşme dosyası
  is_signed           BOOLEAN DEFAULT FALSE,
  isg_katip_done      BOOLEAN DEFAULT FALSE,
  assigned_uzman      TEXT,
  assigned_hekim      TEXT,
  status              TEXT NOT NULL DEFAULT 'Hazırlanıyor'
                      CHECK (status IN (
                        'Hazırlanıyor','Müşteriye Gönderildi','İmza Bekleniyor',
                        'İmzalandı','ISG-Katip Bekleniyor','Aktif','İptal'
                      )),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_contracts_lead_id_idx   ON public.crm_contracts(lead_id);
CREATE INDEX IF NOT EXISTS crm_contracts_tenant_id_idx ON public.crm_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS crm_contracts_status_idx    ON public.crm_contracts(status);

ALTER TABLE public.crm_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_contracts_select" ON public.crm_contracts FOR SELECT
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales', 'staff'));

CREATE POLICY "crm_contracts_insert" ON public.crm_contracts FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales'));

CREATE POLICY "crm_contracts_update" ON public.crm_contracts FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales'));

CREATE POLICY "crm_contracts_delete" ON public.crm_contracts FOR DELETE
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager'));

-- ============================================================
-- 4. Supabase Schema Önbelleğini Yenile (Kritik)
-- ============================================================
NOTIFY pgrst, 'reload schema';
