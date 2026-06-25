-- ============================================================
-- Dinamik Rol ve Sayfa Yetkilendirme Tabloları
-- Supabase SQL Editöründe çalıştırılmalıdır.
-- ============================================================

-- 1. Firmaya (Tenant) Özel Eklenen Rollerin Tutulacağı Tablo
CREATE TABLE IF NOT EXISTS public.tenant_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role_key VARCHAR(50) NOT NULL, -- örn: 'muhasebe'
    role_name VARCHAR(100) NOT NULL, -- örn: 'Muhasebe Sorumlusu'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, role_key)
);

-- RLS'i Etkinleştir
ALTER TABLE public.tenant_roles ENABLE ROW LEVEL SECURITY;

-- Politikaları Temizle
DROP POLICY IF EXISTS "tenant_roles_select" ON public.tenant_roles;
DROP POLICY IF EXISTS "tenant_roles_insert" ON public.tenant_roles;
DROP POLICY IF EXISTS "tenant_roles_update" ON public.tenant_roles;
DROP POLICY IF EXISTS "tenant_roles_delete" ON public.tenant_roles;

-- Politikaları Tanımla
CREATE POLICY "tenant_roles_select" ON public.tenant_roles FOR SELECT
USING (
  tenant_id = public.osgb_staff_current_tenant_id()
  OR public.osgb_staff_is_super_admin()
);

CREATE POLICY "tenant_roles_insert" ON public.tenant_roles FOR INSERT
WITH CHECK (
  tenant_id = public.osgb_staff_current_tenant_id()
  OR public.osgb_staff_is_super_admin()
);

CREATE POLICY "tenant_roles_update" ON public.tenant_roles FOR UPDATE
USING (
  tenant_id = public.osgb_staff_current_tenant_id()
  OR public.osgb_staff_is_super_admin()
)
WITH CHECK (
  tenant_id = public.osgb_staff_current_tenant_id()
  OR public.osgb_staff_is_super_admin()
);

CREATE POLICY "tenant_roles_delete" ON public.tenant_roles FOR DELETE
USING (
  tenant_id = public.osgb_staff_current_tenant_id()
  OR public.osgb_staff_is_super_admin()
);


-- 2. Rollerin Sayfa Bazlı Erişim Yetkilerini Tutacak Tablo
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'uzman', 'hekim', 'dsp', 'sales', 'firma_yetkilisi' veya custom role_key
    page VARCHAR(100) NOT NULL, -- 'risk', 'medical', 'crm', 'schedule', 'workers' vb.
    can_view BOOLEAN DEFAULT TRUE NOT NULL,
    can_action BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, role, page)
);

-- RLS'i Etkinleştir
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Politikaları Temizle
DROP POLICY IF EXISTS "role_permissions_select" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_insert" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_update" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_delete" ON public.role_permissions;

-- Politikaları Tanımla
CREATE POLICY "role_permissions_select" ON public.role_permissions FOR SELECT
USING (
  tenant_id = public.osgb_staff_current_tenant_id()
  OR public.osgb_staff_is_super_admin()
);

CREATE POLICY "role_permissions_insert" ON public.role_permissions FOR INSERT
WITH CHECK (
  tenant_id = public.osgb_staff_current_tenant_id()
  OR public.osgb_staff_is_super_admin()
);

CREATE POLICY "role_permissions_update" ON public.role_permissions FOR UPDATE
USING (
  tenant_id = public.osgb_staff_current_tenant_id()
  OR public.osgb_staff_is_super_admin()
)
WITH CHECK (
  tenant_id = public.osgb_staff_current_tenant_id()
  OR public.osgb_staff_is_super_admin()
);

CREATE POLICY "role_permissions_delete" ON public.role_permissions FOR DELETE
USING (
  tenant_id = public.osgb_staff_current_tenant_id()
  OR public.osgb_staff_is_super_admin()
);

-- Şemayı Yeniden Yükle
NOTIFY pgrst, 'reload schema';
