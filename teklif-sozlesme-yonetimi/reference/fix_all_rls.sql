-- ============================================================
-- OSGB SaaS — Tüm RLS Politikalarını Düzeltme Scripti
-- Supabase SQL Editor'de yapıştırıp çalıştırın (Run)
-- ============================================================

-- 1. Yardımcı Fonksiyonların Güncel Olduğundan Emin Olalım
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


-- 2. Belirtilen Tablolardaki Mevcut RLS Politikalarını Temizleyen Dinamik Fonksiyon
CREATE OR REPLACE FUNCTION public.drop_all_policies_on_table(target_table TEXT)
RETURNS VOID AS $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = target_table AND schemaname = 'public'
  LOOP 
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, target_table);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Tabloları temizleyelim
SELECT public.drop_all_policies_on_table('customer_companies');
SELECT public.drop_all_policies_on_table('crm_leads');
SELECT public.drop_all_policies_on_table('crm_contacts');
SELECT public.drop_all_policies_on_table('crm_activities');
SELECT public.drop_all_policies_on_table('crm_needs');
SELECT public.drop_all_policies_on_table('crm_offers');
SELECT public.drop_all_policies_on_table('crm_contracts');
SELECT public.drop_all_policies_on_table('crm_tasks');

-- Temizlik fonksiyonunu silelim
DROP FUNCTION public.drop_all_policies_on_table(TEXT);


-- ============================================================
-- 3. customer_companies RLS Politikaları
-- ============================================================
ALTER TABLE public.customer_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_companies_select" ON public.customer_companies FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');

CREATE POLICY "customer_companies_insert" ON public.customer_companies FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');

CREATE POLICY "customer_companies_update" ON public.customer_companies FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');

CREATE POLICY "customer_companies_delete" ON public.customer_companies FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');


-- ============================================================
-- 4. crm_leads RLS Politikaları
-- ============================================================
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_leads_select" ON public.crm_leads FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'staff' AND assigned_to = auth.email())
  );

CREATE POLICY "crm_leads_insert" ON public.crm_leads FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin'
  );

CREATE POLICY "crm_leads_update" ON public.crm_leads FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin'
    OR (public.get_user_role() = 'sales' AND assigned_to = auth.email())
  );

CREATE POLICY "crm_leads_delete" ON public.crm_leads FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');


-- ============================================================
-- 5. crm_contacts RLS Politikaları
-- ============================================================
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_contacts_select" ON public.crm_contacts FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');

CREATE POLICY "crm_contacts_insert" ON public.crm_contacts FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');

CREATE POLICY "crm_contacts_update" ON public.crm_contacts FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');

CREATE POLICY "crm_contacts_delete" ON public.crm_contacts FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');


-- ============================================================
-- 6. crm_activities RLS Politikaları
-- ============================================================
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_activities_select" ON public.crm_activities FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');

CREATE POLICY "crm_activities_insert" ON public.crm_activities FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');

CREATE POLICY "crm_activities_update" ON public.crm_activities FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');

CREATE POLICY "crm_activities_delete" ON public.crm_activities FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');


-- ============================================================
-- 7. crm_needs RLS Politikaları
-- ============================================================
ALTER TABLE public.crm_needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_needs_select" ON public.crm_needs FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');

CREATE POLICY "crm_needs_insert" ON public.crm_needs FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');

CREATE POLICY "crm_needs_update" ON public.crm_needs FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');

CREATE POLICY "crm_needs_delete" ON public.crm_needs FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');


-- ============================================================
-- 8. crm_offers RLS Politikaları
-- ============================================================
ALTER TABLE public.crm_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_offers_select" ON public.crm_offers FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');

CREATE POLICY "crm_offers_insert" ON public.crm_offers FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');

CREATE POLICY "crm_offers_update" ON public.crm_offers FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');

CREATE POLICY "crm_offers_delete" ON public.crm_offers FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');


-- ============================================================
-- 9. crm_contracts RLS Politikaları
-- ============================================================
ALTER TABLE public.crm_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_contracts_select" ON public.crm_contracts FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');

CREATE POLICY "crm_contracts_insert" ON public.crm_contracts FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');

CREATE POLICY "crm_contracts_update" ON public.crm_contracts FOR UPDATE
  USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');

CREATE POLICY "crm_contracts_delete" ON public.crm_contracts FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');


-- ============================================================
-- 10. crm_tasks RLS Politikaları
-- ============================================================
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_tasks_select" ON public.crm_tasks FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin'
    OR assigned_to = auth.email()
  );

CREATE POLICY "crm_tasks_insert" ON public.crm_tasks FOR INSERT
  WITH CHECK (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');

CREATE POLICY "crm_tasks_update" ON public.crm_tasks FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin'
    OR assigned_to = auth.email()
  );

CREATE POLICY "crm_tasks_delete" ON public.crm_tasks FOR DELETE
  USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() = 'admin');

-- 11. Şema Önbelleğini Yenileyelim
NOTIFY pgrst, 'reload schema';
