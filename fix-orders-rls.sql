-- Fix RLS policies for orders table to allow retailer-to-wholesaler orders

-- First, drop all existing policies to start fresh
DROP POLICY IF EXISTS "orders_buyer_select" ON orders;
DROP POLICY IF EXISTS "orders_buyer_insert" ON orders;
DROP POLICY IF EXISTS "orders_buyer_update" ON orders;
DROP POLICY IF EXISTS "orders_seller_select" ON orders;
DROP POLICY IF EXISTS "orders_seller_update" ON orders;
DROP POLICY IF EXISTS "orders_buyer_access" ON orders;
DROP POLICY IF EXISTS "orders_buyer_update_payment" ON orders;

-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow users to SELECT orders where they are the buyer
CREATE POLICY "orders_buyer_select" ON orders
FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

-- Policy 2: Allow users to SELECT orders where they are the seller
CREATE POLICY "orders_seller_select" ON orders
FOR SELECT
TO authenticated
USING (seller_id = auth.uid());

-- Policy 3: Allow users to INSERT orders where they are the buyer
CREATE POLICY "orders_buyer_insert" ON orders
FOR INSERT
TO authenticated
WITH CHECK (buyer_id = auth.uid());

-- Policy 4: Allow buyers to UPDATE their own orders (for payment, status, etc.)
CREATE POLICY "orders_buyer_update" ON orders
FOR UPDATE
TO authenticated
USING (buyer_id = auth.uid())
WITH CHECK (buyer_id = auth.uid());

-- Policy 5: Allow sellers to UPDATE orders where they are the seller (for status changes)
CREATE POLICY "orders_seller_update" ON orders
FOR UPDATE
TO authenticated
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'orders';
