// Stripe Payment Gateway Integration

interface StripePaymentOptions {
  amount: number;
  orderId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  description: string;
  onSuccess: (paymentId: string, orderId: string) => void;
  onFailure: (error: any) => void;
}

declare global {
  interface Window {
    Stripe: any;
  }
}

// Stripe publishable key from environment
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51QRnbZRqCVOQlIEu6jmrWLHgZzC2kcmN8YGfp4tYvN4kXjL8uBKFPj0FU8gGMDQIiLB8KnMrJPgJFSKjh0Wf9Z3W00YQjWjMvI';

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://daswejqhwwoyioarcnhk.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhc3dlanFod3dveWlvYXJjbmhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDAxMzQsImV4cCI6MjA3OTI3NjEzNH0.05GQUCyuTKut2sr2mCNUJXPxaGcSy1r2eTvFWHgiljc';
const PAYMENT_INTENT_URL = `${SUPABASE_URL}/functions/v1/create-payment-intent`;

console.log('💳 Stripe Config:', {
  publishableKey: STRIPE_PUBLISHABLE_KEY.substring(0, 20) + '...',
  paymentIntentUrl: PAYMENT_INTENT_URL
});

/**
 * Load Stripe script dynamically
 */
export const loadStripeScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check if already loaded
    if (window.Stripe) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Create PaymentIntent via backend
 */
const createPaymentIntent = async (
  amount: number,
  orderId: string,
  description: string,
  customerEmail?: string,
  customerName?: string
): Promise<{ clientSecret: string; paymentIntentId: string }> => {
  try {
    console.log('🔄 Creating PaymentIntent:', { amount, orderId, url: PAYMENT_INTENT_URL });
    
    const response = await fetch(PAYMENT_INTENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        amount,
        orderId,
        description,
        customerEmail,
        customerName,
      }),
    });

    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { error: errorText };
      }
      throw new Error(error.error || error.message || 'Failed to create payment intent');
    }

    const result = await response.json();
    console.log('✅ PaymentIntent created successfully');
    return result;
  } catch (error: any) {
    console.error('❌ Error creating payment intent:', error);
    throw error;
  }
};

/**
 * Initialize and display Stripe payment using Payment Element
 */
export const initiateStripePayment = async ({
  amount,
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  description,
  onSuccess,
  onFailure,
}: StripePaymentOptions): Promise<void> => {
  const isLoaded = await loadStripeScript();

  if (!isLoaded) {
    onFailure({ message: 'Failed to load payment gateway. Please try again.' });
    return;
  }

  try {
    console.log('💳 Initializing Stripe payment:', { amount, orderId, description });

    // Initialize Stripe
    const stripe = window.Stripe(STRIPE_PUBLISHABLE_KEY);

    // Create PaymentIntent on backend
    const { clientSecret, paymentIntentId } = await createPaymentIntent(
      amount,
      orderId,
      description,
      customerEmail,
      customerName
    );

    console.log('✅ PaymentIntent created:', paymentIntentId);

    // Create payment modal
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'stripe-payment-modal';
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      z-index: 10000;
    `;

    modalContent.innerHTML = `
      <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600;">Complete Payment</h2>
      <p style="color: #666; margin: 0 0 24px;">Amount: ₹${amount.toFixed(2)}</p>
      <div id="payment-element"></div>
      <div style="margin-top: 24px; display: flex; gap: 12px;">
        <button id="cancel-payment" style="
          flex: 1;
          padding: 12px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">Cancel</button>
        <button id="submit-payment" style="
          flex: 1;
          padding: 12px;
          background: #0070f3;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">Pay ₹${amount.toFixed(2)}</button>
      </div>
      <div id="payment-message" style="margin-top: 16px; color: #dc2626; font-size: 14px;"></div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Initialize Stripe Elements
    const elements = stripe.elements({ clientSecret });
    const paymentElement = elements.create('payment', {
      layout: {
        type: 'accordion',
        defaultCollapsed: false,
        radios: true,
        spacedAccordionItems: false
      }
    });
    
    console.log('🎨 Mounting payment element...');
    paymentElement.mount('#payment-element');
    
    paymentElement.on('ready', () => {
      console.log('✅ Payment element ready');
    });
    
    paymentElement.on('change', (event) => {
      console.log('📝 Payment element changed:', event);
    });

    const submitButton = document.getElementById('submit-payment') as HTMLButtonElement;
    const cancelButton = document.getElementById('cancel-payment') as HTMLButtonElement;
    const messageDiv = document.getElementById('payment-message') as HTMLDivElement;

    const cleanup = () => {
      document.body.removeChild(modalOverlay);
    };

    // Handle cancel
    cancelButton.onclick = () => {
      cleanup();
      onFailure({ message: 'Payment cancelled by user' });
    };

    // Handle submit
    submitButton.onclick = async () => {
      submitButton.disabled = true;
      submitButton.textContent = 'Processing...';
      messageDiv.textContent = '';

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        messageDiv.textContent = error.message || 'Payment failed';
        submitButton.disabled = false;
        submitButton.textContent = `Pay ₹${amount.toFixed(2)}`;
        console.error('❌ Payment failed:', error);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('✅ Payment successful:', paymentIntent.id);
        cleanup();
        onSuccess(paymentIntent.id, orderId);
      } else {
        messageDiv.textContent = 'Payment processing failed';
        submitButton.disabled = false;
        submitButton.textContent = `Pay ₹${amount.toFixed(2)}`;
      }
    };

  } catch (error: any) {
    console.error('Stripe initialization error:', error);
    onFailure({ message: error.message || 'Payment initialization failed' });
  }
};

/**
 * Create a test payment (for demo purposes - simulates successful payment)
 */
export const createTestPayment = async ({
  amount,
  orderId,
  description,
  onSuccess,
  onFailure,
}: {
  amount: number;
  orderId: string;
  description: string;
  onSuccess: (paymentId: string, orderId: string) => void;
  onFailure: (error: any) => void;
}): Promise<void> => {
  return new Promise((resolve) => {
    // Simulate payment processing delay
    setTimeout(() => {
      // Generate a test payment ID (Stripe format)
      const testPaymentId = `pi_test_${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('🧪 Test Stripe payment simulated:', {
        paymentId: testPaymentId,
        orderId: orderId,
        amount: amount,
        description: description,
      });

      onSuccess(testPaymentId, orderId);
      resolve();
    }, 2000); // 2 second delay to simulate processing
  });
};

/**
 * Format amount for display
 */
export const formatAmount = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
