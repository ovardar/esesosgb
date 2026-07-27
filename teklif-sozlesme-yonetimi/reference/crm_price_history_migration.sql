-- CRM Fiyat Geçmişi Tablosu
CREATE TABLE IF NOT EXISTS public.crm_price_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  danger_class TEXT NOT NULL,
  min_emp      INTEGER NOT NULL,
  max_emp      INTEGER,
  service_name TEXT NOT NULL,
  old_price    NUMERIC(12,2) NOT NULL,
  new_price    NUMERIC(12,2) NOT NULL,
  changed_by   TEXT NOT NULL,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS crm_price_history_tenant_idx ON public.crm_price_history(tenant_id);

-- RLS (Row Level Security) Etkinleştirme
ALTER TABLE public.crm_price_history ENABLE ROW LEVEL SECURITY;

-- Politikalar
CREATE POLICY "crm_price_history_select" ON public.crm_price_history FOR SELECT
  USING (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales', 'staff'));

CREATE POLICY "crm_price_history_insert" ON public.crm_price_history FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('admin', 'manager', 'sales'));
