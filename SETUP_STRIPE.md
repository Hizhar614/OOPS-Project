# Stripe Payment Setup Guide

## Quick Start

### 1. Get Your Stripe Keys

1. Go to [stripe.com](https://stripe.com) and create an account
2. Navigate to **Developers** → **API keys**
3. Copy your keys:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

### 2. Configure Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

### 3. Set Supabase Secrets

The Stripe Secret Key must be stored securely in Supabase:

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Set the secret
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

### 4. Run Database Migration

Execute the SQL migration in your Supabase SQL Editor:

```sql
-- Copy and paste from add-payment-id-column.sql
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_id TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);

COMMENT ON COLUMN orders.payment_id IS 'Stripe payment intent ID for online payments';
```

### 5. Deploy the Edge Function

```bash
# Deploy the Stripe PaymentIntent creation function
supabase functions deploy create-payment-intent

# Verify deployment
supabase functions list
```

### 6. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Use Stripe test cards:
   - **Success**: `4242 4242 4242 4242`
   - **Decline**: `4000 0000 0000 0002`
   - **3D Secure**: `4000 0025 0000 3155`
   - **Expiry**: Any future date
   - **CVC**: Any 3 digits
   - **ZIP**: Any 5 digits

## Payment Flows

### Customer → Retailer Payment
1. Customer adds items to cart
2. Selects "Home Delivery" with "Online Payment"
3. Clicks "Place Order"
4. Stripe payment modal appears
5. Customer enters card details
6. Payment processes through Stripe
7. Order is created with payment_id stored

### Retailer → Wholesaler Payment
1. Wholesaler approves stock order
2. Retailer clicks "Select Payment & Confirm"
3. Chooses "Online Payment via Stripe"
4. Clicks "Pay ₹amount"
5. Stripe payment modal appears
6. Retailer enters card details
7. Payment processes
8. Order status updates to "order_confirmed"

## Troubleshooting

### Payment modal doesn't appear
- Check browser console for errors
- Verify VITE_STRIPE_PUBLISHABLE_KEY is set
- Ensure Stripe script loads (check Network tab)

### Backend errors
- Verify Edge Function is deployed: `supabase functions list`
- Check Edge Function logs: `supabase functions logs create-payment-intent`
- Ensure STRIPE_SECRET_KEY is set in Supabase secrets

### Database errors
- Run the migration SQL in Supabase SQL Editor
- Check if payment_id column exists in orders table
- Verify RLS policies allow inserts/updates

### Testing fails
- Use Stripe test cards (not real cards in test mode)
- Check Stripe Dashboard → Payments for test transactions
- Enable Stripe test mode (toggle in dashboard)

## Production Checklist

- [ ] Replace test keys with live keys (`pk_live_*` and `sk_live_*`)
- [ ] Update VITE_STRIPE_PUBLISHABLE_KEY in production environment
- [ ] Set live STRIPE_SECRET_KEY in Supabase production secrets
- [ ] Enable Stripe webhooks for payment confirmations
- [ ] Set up proper error logging and monitoring
- [ ] Test complete payment flows end-to-end
- [ ] Review Stripe security best practices
- [ ] Configure payment retry logic for failed payments
- [ ] Set up refund handling if needed
- [ ] Add payment receipt generation

## Security Notes

⚠️ **IMPORTANT**:
- Never commit `.env` file to version control
- Never expose Secret Keys (`sk_*`) in frontend code
- Always validate payment amounts on the backend
- Use HTTPS in production
- Implement proper error handling
- Set up Stripe webhooks for payment verification

## Stripe Dashboard

Monitor payments at: https://dashboard.stripe.com

### Test Mode
- View test payments
- Access test API keys
- Use test cards

### Live Mode
- Process real payments
- Access live API keys
- Real cards only

## Support

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
