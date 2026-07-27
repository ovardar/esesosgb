-- ============================================================
-- OSGB SaaS — CRM Modülü İSG-Katip & Muhasebe Entegrasyonu
-- Tarih: 27.06.2026
-- Supabase SQL Editor'de çalıştırın
-- ============================================================

-- 1. customer_companies tablosuna entegrasyon kolonları
ALTER TABLE public.customer_companies
ADD COLUMN IF NOT EXISTS isg_katip_firm_id TEXT,
ADD COLUMN IF NOT EXISTS accounting_firm_id TEXT,
ADD COLUMN IF NOT EXISTS sgk_sicil_no TEXT;

-- 2. crm_contracts tablosuna entegrasyon kolonları
ALTER TABLE public.crm_contracts
ADD COLUMN IF NOT EXISTS isg_katip_contract_id TEXT,
ADD COLUMN IF NOT EXISTS contract_type TEXT;

-- 3. osgb_staff tablosuna entegrasyon kolonları
ALTER TABLE public.osgb_staff
ADD COLUMN IF NOT EXISTS tc_kimlik_no TEXT;

-- Indexlemeler (Performans için arama/eşleştirme alanları)
CREATE INDEX IF NOT EXISTS idx_cust_isg_katip ON public.customer_companies(isg_katip_firm_id);
CREATE INDEX IF NOT EXISTS idx_cust_accounting ON public.customer_companies(accounting_firm_id);
CREATE INDEX IF NOT EXISTS idx_staff_tc ON public.osgb_staff(tc_kimlik_no);
CREATE INDEX IF NOT EXISTS idx_contract_isg_katip ON public.crm_contracts(isg_katip_contract_id);
