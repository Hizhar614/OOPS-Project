-- Add payment_id column to orders table to store Stripe payment IDs
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_id TEXT;

-- Add index for faster payment lookups
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);

-- Add comment for documentation
COMMENT ON COLUMN orders.payment_id IS 'Stripe payment intent ID for online payments';
