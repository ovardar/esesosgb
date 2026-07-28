-- ============================================================
-- Supabase OSGB-SaaS (dnvuizausfcjzkcsynql) Güvenlik & RLS Onarım Scripti
-- Bu kodu Supabase Dashboard -> SQL Editor alanında çalıştırın (Run).
-- ============================================================

-- 1. PUBLIC ŞEMASINDAKİ TÜM TABLOLARDA RLS'Yİ (ROW LEVEL SECURITY) ZORUNLU KILALIM
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;

-- 2. YARDIMCI GÜVENLİK FONKSİYONLARI (RECURSION'I ÖNLEYEN SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.osgb_staff_current_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.osgb_staff
  WHERE email = auth.email()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.osgb_staff_is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.osgb_staff
    WHERE email = auth.email()
      AND access_role = 'super_admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.osgb_staff_current_tenant_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.osgb_staff_is_super_admin() TO authenticated, anon;

-- 3. OSGB STAFF POLİTİKALARI
DROP POLICY IF EXISTS "osgb_staff_select" ON public.osgb_staff;
DROP POLICY IF EXISTS "osgb_staff_insert" ON public.osgb_staff;
DROP POLICY IF EXISTS "osgb_staff_update" ON public.osgb_staff;
DROP POLICY IF EXISTS "osgb_staff_delete" ON public.osgb_staff;

CREATE POLICY "osgb_staff_select" ON public.osgb_staff FOR SELECT
USING (tenant_id = public.osgb_staff_current_tenant_id() OR public.osgb_staff_is_super_admin());

CREATE POLICY "osgb_staff_insert" ON public.osgb_staff FOR INSERT
WITH CHECK (tenant_id = public.osgb_staff_current_tenant_id() OR public.osgb_staff_is_super_admin());

CREATE POLICY "osgb_staff_update" ON public.osgb_staff FOR UPDATE
USING (tenant_id = public.osgb_staff_current_tenant_id() OR public.osgb_staff_is_super_admin());

CREATE POLICY "osgb_staff_delete" ON public.osgb_staff FOR DELETE
USING (tenant_id = public.osgb_staff_current_tenant_id() OR public.osgb_staff_is_super_admin());


-- 4. DİĞER CORE TABLOLAR İÇİN VARSAYILAN TENANT İZİNLERİ (CUSTOMER_COMPANIES, CRM_OFFERS vb.)
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'customer_companies', 'crm_leads', 'crm_contacts', 
    'crm_activities', 'crm_needs', 'crm_offers', 
    'crm_contracts', 'crm_tasks'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    -- Mevcut politikaları düşür
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', tbl || '_tenant_all', tbl);
    
    -- Yeni tenant ve super_admin izin politikası oluştur
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (tenant_id = public.osgb_staff_current_tenant_id() OR public.osgb_staff_is_super_admin());',
      tbl || '_tenant_all', tbl
    );
  END LOOP;
END $$;

-- 5. SUPABASE ÖNBELLEĞİNİ YENİLEYELİM
NOTIFY pgrst, 'reload schema';
