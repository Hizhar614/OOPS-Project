-- Drop existing buyer policy if it exists
DROP POLICY IF EXISTS "orders_buyer_access" ON orders;
DROP POLICY IF EXISTS "orders_buyer_update_payment" ON orders;

-- Allow buyers to SELECT their own orders
CREATE POLICY "orders_buyer_select" ON orders
FOR SELECT
TO authenticated
USING (buyer_id = auth.uid());

-- Allow buyers to INSERT their own orders
CREATE POLICY "orders_buyer_insert" ON orders
FOR INSERT
TO authenticated
WITH CHECK (buyer_id = auth.uid());

-- Allow buyers to UPDATE payment info on their own orders
CREATE POLICY "orders_buyer_update" ON orders
FOR UPDATE
TO authenticated
USING (buyer_id = auth.uid())
WITH CHECK (buyer_id = auth.uid());

-- Allow sellers to SELECT orders where they are the seller
CREATE POLICY "orders_seller_select" ON orders
FOR SELECT
TO authenticated
USING (seller_id = auth.uid());

-- Allow sellers to UPDATE orders where they are the seller
CREATE POLICY "orders_seller_update" ON orders
FOR UPDATE
TO authenticated
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());
