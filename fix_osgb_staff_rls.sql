-- ============================================================
-- Fix: osgb_staff RLS for Super Admin tenant provisioning
-- Problem: Super Admin yeni tenant icin osgb_staff insert yaparken
--          "new row violates row-level security policy" hatasi aliyor.
--          Ayrica self-query nedeniyle "infinite recursion detected" olusabiliyor.
-- ============================================================

ALTER TABLE public.osgb_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "osgb_staff_select" ON public.osgb_staff;
DROP POLICY IF EXISTS "osgb_staff_insert" ON public.osgb_staff;
DROP POLICY IF EXISTS "osgb_staff_update" ON public.osgb_staff;
DROP POLICY IF EXISTS "osgb_staff_delete" ON public.osgb_staff;

-- Recursion'i engellemek icin osgb_staff sorgusunu SECURITY DEFINER helper
-- fonksiyonlarina tasiyoruz. Policy icinde dogrudan osgb_staff sorgulamayin.

CREATE OR REPLACE FUNCTION public.osgb_staff_current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.osgb_staff
  WHERE email = auth.email()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.osgb_staff_is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
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

CREATE POLICY "osgb_staff_select" ON public.osgb_staff FOR SELECT
USING (
  tenant_id = public.osgb_staff_current_tenant_id()
  OR public.osgb_staff_is_super_admin()
);

CREATE POLICY "osgb_staff_insert" ON public.osgb_staff FOR INSERT
WITH CHECK (
  tenant_id = public.osgb_staff_current_tenant_id()
  OR public.osgb_staff_is_super_admin()
);

CREATE POLICY "osgb_staff_update" ON public.osgb_staff FOR UPDATE
USING (
  tenant_id = public.osgb_staff_current_tenant_id()
  OR public.osgb_staff_is_super_admin()
)
WITH CHECK (
  tenant_id = public.osgb_staff_current_tenant_id()
  OR public.osgb_staff_is_super_admin()
);

CREATE POLICY "osgb_staff_delete" ON public.osgb_staff FOR DELETE
USING (
  tenant_id = public.osgb_staff_current_tenant_id()
  OR public.osgb_staff_is_super_admin()
);

NOTIFY pgrst, 'reload schema';
