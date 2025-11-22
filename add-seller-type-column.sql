-- Create user_role enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'retailer', 'wholesaler');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add seller_type column to products table if it doesn't exist
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS seller_type user_role;

-- Update existing products to set seller_type based on the seller's role
UPDATE public.products p
SET seller_type = prof.role::user_role
FROM public.profiles prof
WHERE p.seller_id = prof.id
  AND p.seller_type IS NULL;
