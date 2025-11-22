-- Add source column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'in_store' CHECK (source IN ('in_store', 'wholesaler_proxy'));

-- Update existing products to have 'in_store' as default
UPDATE public.products 
SET source = 'in_store' 
WHERE source IS NULL;
