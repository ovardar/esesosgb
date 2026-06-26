-- CRM Fiyat Listesi Tablosu ve Yetkilendirme Scripti
CREATE TABLE IF NOT EXISTS public.crm_price_list (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  danger_class TEXT NOT NULL CHECK (danger_class IN ('Az Tehlikeli','Tehlikeli','Çok Tehlikeli')),
  min_emp      INTEGER NOT NULL DEFAULT 1,
  max_emp      INTEGER,
  service_name TEXT NOT NULL,
  price        NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS crm_price_list_tenant_id_idx ON public.crm_price_list(tenant_id);
CREATE INDEX IF NOT EXISTS crm_price_list_danger_idx ON public.crm_price_list(danger_class);

-- RLS (Row Level Security) Etkinleştirme
ALTER TABLE public.crm_price_list ENABLE ROW LEVEL SECURITY;

-- Politikalar (Policies)
CREATE POLICY "crm_price_list_select" ON public.crm_price_list FOR SELECT
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales', 'staff'));

CREATE POLICY "crm_price_list_insert" ON public.crm_price_list FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales'));

CREATE POLICY "crm_price_list_update" ON public.crm_price_list FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales'));

CREATE POLICY "crm_price_list_delete" ON public.crm_price_list FOR DELETE
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager'));
