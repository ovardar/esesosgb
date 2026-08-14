-- Fiyat Listeleri için Migration Scripti
-- Bu kodu Supabase Dashboard -> SQL Editor üzerinden çalıştırın.

-- 1. price_lists tablosunu oluştur
CREATE TABLE IF NOT EXISTS public.price_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.5. price_rules tablosunu oluştur (eğer yoksa)
CREATE TABLE IF NOT EXISTS public.price_rules (
    id TEXT PRIMARY KEY,
    danger_class TEXT,
    min_emp INTEGER,
    max_emp INTEGER,
    service_name TEXT,
    price NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. price_rules tablosuna price_list_id kolonu ekle
ALTER TABLE public.price_rules 
ADD COLUMN IF NOT EXISTS price_list_id UUID REFERENCES public.price_lists(id) ON DELETE CASCADE;

-- 3. Mevcut price_rules kayıtlarının boşa düşmemesi için varsayılan bir fiyat listesi oluştur ve ata
DO $$ 
DECLARE
    default_list_id UUID;
BEGIN
    -- Eğer hiç liste yoksa yeni bir liste oluştur
    IF NOT EXISTS (SELECT 1 FROM public.price_lists WHERE is_default = true LIMIT 1) THEN
        INSERT INTO public.price_lists (name, description, is_default) 
        VALUES ('Genel Fiyat Listesi', 'Sistemdeki standart fiyat listesi', true)
        RETURNING id INTO default_list_id;
    ELSE
        SELECT id INTO default_list_id FROM public.price_lists WHERE is_default = true LIMIT 1;
    END IF;

    -- Eğer price_rules tablosunda listeye bağlı olmayan kayıtlar varsa onlara default listeyi ata
    UPDATE public.price_rules 
    SET price_list_id = default_list_id 
    WHERE price_list_id IS NULL;
END $$;

-- 3.5. offers tablosunu oluştur (eğer yoksa)
CREATE TABLE IF NOT EXISTS public.offers (
    id TEXT PRIMARY KEY,
    offer_no TEXT,
    customer_name TEXT,
    subject TEXT,
    status TEXT,
    current_revision_no INTEGER,
    created_date TEXT,
    valid_until_date TEXT,
    owner TEXT,
    vat_mode TEXT,
    revisions JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. offers (teklifler) tablosuna price_list_id kolonu ekle
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS price_list_id UUID REFERENCES public.price_lists(id) ON DELETE SET NULL;
