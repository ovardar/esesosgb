-- Engelli çalışan takibi için workers tablosuna is_disabled sütunu ekleme
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT FALSE;
