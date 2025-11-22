# Stripe Payment Intent Function

This Supabase Edge Function creates Stripe PaymentIntents for processing payments.

## Setup

1. Set your Stripe Secret Key as a Supabase secret:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_key_here
```

2. Deploy the function:
```bash
supabase functions deploy create-payment-intent
```

## Usage

Send POST request to the function endpoint with:
```json
{
  "amount": 1000,
  "orderId": "order_123",
  "description": "Order payment",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe"
}
```

Returns:
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```
