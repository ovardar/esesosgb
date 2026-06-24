-- ============================================================
-- OSGB SaaS — CRM Modülü Supabase Tablo Scriptleri
-- Kararlar: Öneri A | Roller: admin, manager, sales, staff
-- PDF export desteği dahil
-- Supabase SQL Editor'de çalıştırın (sırayla tümünü seçip Run)
-- ============================================================

-- ============================================================
-- YARDIMCI FONKSİYON: Kullanıcının tenant_id'sini döndürür
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

-- ============================================================
-- YARDIMCI FONKSİYON: Kullanıcının rolünü döndürür
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT access_role
  FROM public.osgb_staff
  WHERE email = auth.email()
  LIMIT 1;
$$;


-- ============================================================
-- 1. crm_leads — Potansiyel Firma / Lead
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_name          TEXT NOT NULL,
  tax_no                TEXT,
  tax_office            TEXT,
  sector                TEXT,
  nace_code             TEXT,
  danger_class          TEXT CHECK (danger_class IN ('Az Tehlikeli', 'Tehlikeli', 'Çok Tehlikeli')),
  employee_count        INTEGER,
  city                  TEXT,
  district              TEXT,
  address               TEXT,
  website               TEXT,
  lead_source           TEXT NOT NULL DEFAULT 'Diğer'
                        CHECK (lead_source IN (
                          'Web Sitesi','Telefon','Referans','Mevcut Müşteri Tavsiyesi',
                          'Google','Sosyal Medya','Saha Ziyareti','E-posta',
                          'Fuar / Etkinlik','Soğuk Arama','Diğer'
                        )),
  stage                 TEXT NOT NULL DEFAULT 'Yeni Kayıt'
                        CHECK (stage IN (
                          'Yeni Kayıt','İlk Görüşme Yapılacak','Görüşme Yapıldı',
                          'Teklif Hazırlanacak','Teklif Gönderildi','Pazarlıkta',
                          'Sözleşme Bekleniyor','Kazanıldı','Kaybedildi','Askıda'
                        )),
  lead_status           TEXT NOT NULL DEFAULT 'Fırsat'
                        CHECK (lead_status IN ('Fırsat','İşlemde','Kazanıldı','Kaybedildi','Askıda')),
  lost_reason           TEXT,
  notes                 TEXT,
  assigned_to           TEXT,                          -- sorumlu sales/uzman
  is_converted          BOOLEAN NOT NULL DEFAULT FALSE,
  converted_company_id  UUID REFERENCES public.customer_companies(id),
  created_by            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_leads_tenant_id_idx ON public.crm_leads(tenant_id);
CREATE INDEX IF NOT EXISTS crm_leads_stage_idx      ON public.crm_leads(stage);
CREATE INDEX IF NOT EXISTS crm_leads_status_idx     ON public.crm_leads(lead_status);
CREATE INDEX IF NOT EXISTS crm_leads_assigned_idx   ON public.crm_leads(assigned_to);

-- Otomatik updated_at trigger
CREATE OR REPLACE FUNCTION public.crm_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE OR REPLACE TRIGGER crm_leads_updated_at
  BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_set_updated_at();

-- Row Level Security
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

-- SELECT: admin, manager, sales kendi tenant'ını görür
--         staff sadece kendine atanan lead'leri görür
CREATE POLICY "crm_leads_select" ON public.crm_leads FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id()
    AND (
      public.get_user_role() IN ('admin', 'manager', 'sales')
      OR (public.get_user_role() = 'staff' AND assigned_to = auth.email())
    )
  );

-- INSERT: admin, manager, sales ekleyebilir
CREATE POLICY "crm_leads_insert" ON public.crm_leads FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales')
  );

-- UPDATE: admin, manager her şeyi; sales sadece kendi lead'ini güncelleyebilir
CREATE POLICY "crm_leads_update" ON public.crm_leads FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id()
    AND (
      public.get_user_role() IN ('admin', 'manager')
      OR (public.get_user_role() = 'sales' AND assigned_to = auth.email())
    )
  );

-- DELETE: sadece admin ve manager
CREATE POLICY "crm_leads_delete" ON public.crm_leads FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager')
  );


-- ============================================================
-- 2. crm_contacts — Yetkili / İletişim Kişileri
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id               UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  full_name             TEXT NOT NULL,
  title                 TEXT,
  phone                 TEXT,
  email                 TEXT,
  is_primary            BOOLEAN NOT NULL DEFAULT FALSE,
  is_invoice_contact    BOOLEAN NOT NULL DEFAULT FALSE,
  is_contract_authority BOOLEAN NOT NULL DEFAULT FALSE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_contacts_lead_id_idx   ON public.crm_contacts(lead_id);
CREATE INDEX IF NOT EXISTS crm_contacts_tenant_id_idx ON public.crm_contacts(tenant_id);

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_contacts_select" ON public.crm_contacts FOR SELECT
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales', 'staff'));

CREATE POLICY "crm_contacts_insert" ON public.crm_contacts FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales'));

CREATE POLICY "crm_contacts_update" ON public.crm_contacts FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales'));

CREATE POLICY "crm_contacts_delete" ON public.crm_contacts FOR DELETE
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager'));


-- ============================================================
-- 3. crm_activities — Görüşme / Aktivite Kaydı
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id       UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL DEFAULT 'Not'
                CHECK (activity_type IN ('Telefon','Toplantı','E-posta','WhatsApp','Not','Ziyaret')),
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  summary       TEXT NOT NULL,
  next_action   TEXT,                                  -- sonraki adım notu
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_activities_lead_id_idx   ON public.crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS crm_activities_tenant_id_idx ON public.crm_activities(tenant_id);
CREATE INDEX IF NOT EXISTS crm_activities_date_idx      ON public.crm_activities(activity_date);

ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_activities_select" ON public.crm_activities FOR SELECT
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales', 'staff'));

CREATE POLICY "crm_activities_insert" ON public.crm_activities FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales', 'staff'));

CREATE POLICY "crm_activities_update" ON public.crm_activities FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales'));

CREATE POLICY "crm_activities_delete" ON public.crm_activities FOR DELETE
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager'));


-- ============================================================
-- 4. crm_needs — İhtiyaç Analizi
-- ============================================================
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
  needs_hospital_screening BOOLEAN DEFAULT FALSE,
  needs_mobile_screening BOOLEAN DEFAULT FALSE,
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


-- ============================================================
-- 5. crm_offers — Teklifler (çoklu versiyon + PDF export)
-- ============================================================
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

-- SELECT: admin, manager, sales görür; staff sadece kendi lead'ine ait teklifleri okuyabilir
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


-- ============================================================
-- 6. crm_contracts — Sözleşme Süreci
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_contracts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id             UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  contract_no         TEXT NOT NULL DEFAULT ('SOZ-' || to_char(NOW(),'YYYY') || '-' || lpad((floor(random()*9000)+1000)::text,4,'0')),
  version             INTEGER NOT NULL DEFAULT 1,
  offer_id            UUID REFERENCES public.crm_offers(id),
  start_date          DATE,
  end_date            DATE,
  service_start_date  DATE,
  monthly_fee         NUMERIC(12,2),
  payment_period      TEXT DEFAULT 'Aylık'
                      CHECK (payment_period IN ('Aylık','3 Aylık','6 Aylık','Yıllık')),
  payment_method      TEXT DEFAULT 'Taksitli'
                      CHECK (payment_method IN ('Taksitli','Nakit','Elden','Dönem Başı','Dönem Sonu')),
  billing_target      TEXT DEFAULT 'Firmaya'
                      CHECK (billing_target IN ('Firmaya','Bağlı OSGB''ye')),
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
CREATE UNIQUE INDEX IF NOT EXISTS crm_contracts_no_version_idx
  ON public.crm_contracts(tenant_id, contract_no, version);

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
-- 7. crm_tasks — Takip Görevleri
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id      UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  assigned_to  TEXT,
  due_date     DATE,
  priority     TEXT NOT NULL DEFAULT 'Normal'
               CHECK (priority IN ('Düşük','Normal','Yüksek')),
  status       TEXT NOT NULL DEFAULT 'Açık'
               CHECK (status IN ('Açık','Tamamlandı','Ertelendi')),
  activity_type TEXT NOT NULL DEFAULT 'Not'
               CHECK (activity_type IN ('Telefon','Toplantı','E-posta','WhatsApp','Not','Ziyaret')),
  notes        TEXT,
  completed_at TIMESTAMPTZ,
  created_by   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_tasks_tenant_id_idx  ON public.crm_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS crm_tasks_due_date_idx   ON public.crm_tasks(due_date);
CREATE INDEX IF NOT EXISTS crm_tasks_assigned_idx   ON public.crm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS crm_tasks_status_idx     ON public.crm_tasks(status);

ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

-- admin/manager hepsini görür; sales/staff kendi görevlerini görür
CREATE POLICY "crm_tasks_select" ON public.crm_tasks FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id()
    AND (
      public.get_user_role() IN ('admin', 'manager')
      OR assigned_to = auth.email()
    )
  );

CREATE POLICY "crm_tasks_insert" ON public.crm_tasks FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales', 'staff'));

CREATE POLICY "crm_tasks_update" ON public.crm_tasks FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id()
    AND (
      public.get_user_role() IN ('admin', 'manager')
      OR assigned_to = auth.email()
    )
  );

CREATE POLICY "crm_tasks_delete" ON public.crm_tasks FOR DELETE
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager'));


-- ============================================================
-- 8. crm_price_matrix — Çalışan Sayısı x Tehlike Sınıfı Birim Fiyat
-- ============================================================
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

CREATE POLICY "crm_price_matrix_select" ON public.crm_price_matrix FOR SELECT
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales', 'staff'));

CREATE POLICY "crm_price_matrix_insert" ON public.crm_price_matrix FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales'));

CREATE POLICY "crm_price_matrix_update" ON public.crm_price_matrix FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales'));

CREATE POLICY "crm_price_matrix_delete" ON public.crm_price_matrix FOR DELETE
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager'));


-- ============================================================
-- ÖZET
-- ============================================================
-- Tablolar          : 8 adet
-- crm_leads         : Lead/potansiyel firma yönetimi
-- crm_contacts      : Yetkili kişiler
-- crm_activities    : Görüşme/aktivite kaydı
-- crm_needs         : İhtiyaç analizi (1 kayıt/lead)
-- crm_offers        : Teklifler (çoklu versiyon, PDF export)
-- crm_contracts     : Sözleşme süreci
-- crm_tasks         : Takip görevleri
-- crm_price_matrix  : Birim fiyat matrisi
--
-- Rol bazlı erişim  :
--   admin   → tam yetki (CRUD tümü)
--   manager → tam yetki (CRUD tümü)
--   sales   → kendi lead/teklif/görev (INSERT+UPDATE+SELECT)
--   staff   → sadece okuma + aktivite ekleme + kendi görevleri
--
-- PDF export        : crm_offers.pdf_url / pdf_generated_at / pdf_generated_by
-- ============================================================
