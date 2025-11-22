# Quick Start - Stripe Integration

## 🚀 What's Been Implemented

✅ **Full Stripe Payment Integration**
- Real Stripe Elements with Payment Element UI
- Supabase Edge Function for PaymentIntent creation
- Database migration for payment tracking
- Both customer and wholesaler payment flows

## 📋 Setup Steps (5 minutes)

### 1. Get Stripe Keys
```
Visit: https://dashboard.stripe.com/test/apikeys
Copy: Publishable Key (pk_test_...)
Copy: Secret Key (sk_test_...)
```

### 2. Configure Frontend
Create `.env` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

### 3. Configure Backend
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_key_here
```

### 4. Deploy Edge Function
```bash
supabase functions deploy create-payment-intent
```

### 5. Run Database Migration
In Supabase SQL Editor, run:
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_id TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);
```

## 🧪 Test It

### Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Expiry: Any future date
CVC: Any 3 digits
```

### Test Flows
1. **Customer Payment**: 
   - Add items to cart → Checkout → Select "Online Payment" → Enter test card
   
2. **Wholesaler Payment**: 
   - Place stock order → Wait for approval → Click "Select Payment" → Choose "Online Payment" → Enter test card

## 📁 Key Files

```
src/lib/stripe.ts                              # Stripe integration
src/components/dashboard/PaymentModal.tsx      # Wholesaler payment
src/components/cart/CheckoutModal.tsx          # Customer payment
supabase/functions/create-payment-intent/      # Backend function
add-payment-id-column.sql                      # Database migration
SETUP_STRIPE.md                                # Detailed guide
```

## ⚡ Features

- ✅ UPI, Cards, Net Banking support
- ✅ 3D Secure authentication
- ✅ Real-time payment confirmation
- ✅ Payment tracking in database
- ✅ Error handling & retry logic
- ✅ Loading states & user feedback

## 🔒 Security

- Secret keys stored in Supabase (not in code)
- PCI compliance handled by Stripe
- HTTPS required for production
- CORS configured properly

## 📚 Documentation

- `SETUP_STRIPE.md` - Complete setup guide
- `STRIPE_INTEGRATION.md` - Technical overview
- `supabase/functions/create-payment-intent/README.md` - Edge function docs

## 🆘 Troubleshooting

**Payment doesn't work?**
- Check browser console for errors
- Verify Edge Function is deployed: `supabase functions list`
- Check function logs: `supabase functions logs create-payment-intent`
- Ensure .env variables are loaded (restart dev server)

**Still stuck?**
See SETUP_STRIPE.md for detailed troubleshooting
