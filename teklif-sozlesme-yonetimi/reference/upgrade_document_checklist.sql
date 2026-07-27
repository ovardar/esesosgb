-- customer_companies tablosuna document_checklist JSONB kolonunu ekler
ALTER TABLE public.customer_companies 
ADD COLUMN IF NOT EXISTS document_checklist JSONB DEFAULT '{}'::jsonb;
