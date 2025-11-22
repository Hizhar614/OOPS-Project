-- Create function to decrease product stock atomically
CREATE OR REPLACE FUNCTION decrease_product_stock(
  product_id UUID,
  quantity_to_decrease INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE products
  SET stock = GREATEST(0, stock - quantity_to_decrease)
  WHERE id = product_id;
END;
$$;
