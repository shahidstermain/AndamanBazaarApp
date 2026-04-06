# Cashfree Seamless Payment Integration

> Complete implementation guide for Cashfree seamless payment flow in AndamanBazaar.

---

## Overview

The seamless integration allows you to collect payment details on your own checkout page and process payments server-side without redirecting users to Cashfree's hosted checkout page.

**Requirements:**
- S2S (Server-to-Server) flag enabled by Cashfree
- PCI DSS compliance for card payments
- Contact: care@cashfree.com to enable these flags

---

## Architecture

### Payment Flow

```
1. Frontend → createSeamlessOrder() → Get Payment Session ID
2. Frontend → Collect Payment Details (UPI/Card/etc.)
3. Frontend → processSeamlessPayment() → Process Payment
4. Cashfree → Webhook → Update Order Status
5. Frontend → getOrderPayments() → Verify Final Status
```

### Security Model

- **All API calls are server-side** (Cloud Functions)
- **Never expose credentials** to frontend
- **Webhook verification** with HMAC SHA256 signature
- **User authentication** required for all operations
- **Listing ownership validation** before payment
- **Audit trail** in Firestore for all transactions

---

## Cloud Functions

### 1. createSeamlessOrder

**Purpose:** Creates a payment order and returns payment session ID for checkout.

**Endpoint:** `https://us-central1-andamanbazaarfirebase.cloudfunctions.net/createSeamlessOrder`

**Request:**
```typescript
{
  listingId: string;
  orderAmount: number;
  customerEmail: string;
  customerPhone?: string;
  customerName?: string;
  returnUrl?: string;
  notifyUrl?: string;
}
```

**Response:**
```typescript
{
  success: true;
  orderId: string;
  cfOrderId: string;
  paymentSessionId: string;
  orderStatus: string;
  orderAmount: number;
  orderCurrency: string;
  orderExpiryTime: string;
}
```

**Frontend Usage:**
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const createOrder = httpsCallable(functions, 'createSeamlessOrder');

const result = await createOrder({
  listingId: 'listing_123',
  orderAmount: 5000,
  customerEmail: 'buyer@example.com',
  customerPhone: '9876543210',
  customerName: 'Rahul Sharma',
});

const { paymentSessionId, orderId } = result.data;
```

**Security Checks:**
- ✓ User authentication required
- ✓ Listing exists and is active
- ✓ Prevents self-purchase
- ✓ Creates temporary listing reservation (15 min)
- ✓ Stores order in Firestore for audit

---

### 2. processSeamlessPayment

**Purpose:** Processes payment using collected payment details.

**Endpoint:** `https://us-central1-andamanbazaarfirebase.cloudfunctions.net/processSeamlessPayment`

**Request:**
```typescript
{
  paymentSessionId: string;
  paymentMethod: {
    type: 'upi' | 'card' | 'netbanking' | 'wallet';
    // UPI example
    upi?: {
      channel: 'collect' | 'intent' | 'qrcode';
      upi_id?: string;
    };
    // Card example
    card?: {
      channel: 'link';
      card_number: string;
      card_holder_name: string;
      card_expiry_mm: string;
      card_expiry_yy: string;
      card_cvv: string;
    };
  };
}
```

**Response:**
```typescript
{
  success: true;
  orderId: string;
  cfPaymentId: string;
  paymentStatus: 'SUCCESS' | 'PENDING' | 'FAILED';
  paymentMessage: string;
}
```

**Frontend Usage:**
```typescript
// UPI Payment
const processPayment = httpsCallable(functions, 'processSeamlessPayment');

const result = await processPayment({
  paymentSessionId: paymentSessionId,
  paymentMethod: {
    type: 'upi',
    upi: {
      channel: 'collect',
      upi_id: 'user@upi',
    },
  },
});

if (result.data.paymentStatus === 'SUCCESS') {
  // Payment successful
}
```

**Security Checks:**
- ✓ User authentication required
- ✓ Verifies user owns the order
- ✓ Updates payment status in Firestore

---

### 3. getOrderPayments

**Purpose:** Retrieves all payment attempts for an order (for status verification).

**Endpoint:** `https://us-central1-andamanbazaarfirebase.cloudfunctions.net/getOrderPayments`

**Request:**
```typescript
{
  orderId: string;
}
```

**Response:**
```typescript
{
  success: true;
  orderId: string;
  payments: Array<{
    cfPaymentId: string;
    paymentStatus: string;
    paymentAmount: number;
    paymentCurrency: string;
    paymentTime: string;
    paymentCompletionTime: string;
    paymentGroup: string;
    paymentMessage: string;
  }>;
}
```

**Frontend Usage:**
```typescript
// After redirect from payment gateway
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get('order_id');

const getPayments = httpsCallable(functions, 'getOrderPayments');
const result = await getPayments({ orderId });

const latestPayment = result.data.payments[0];
if (latestPayment.paymentStatus === 'SUCCESS') {
  // Show success message
}
```

---

### 4. verifyOrderStatus

**Purpose:** Verifies the current status of an order with Cashfree.

**Endpoint:** `https://us-central1-andamanbazaarfirebase.cloudfunctions.net/verifyOrderStatus`

**Request:**
```typescript
{
  orderId: string;
}
```

**Response:**
```typescript
{
  success: true;
  orderId: string;
  cfOrderId: string;
  orderStatus: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  orderAmount: number;
  orderCurrency: string;
  orderExpiryTime: string;
}
```

---

## Frontend Integration Example

### Complete Payment Flow

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from './hooks/useAuth';

const PaymentCheckout: React.FC<{ listingId: string; amount: number }> = ({ listingId, amount }) => {
  const { user } = useAuth();
  const [paymentSessionId, setPaymentSessionId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Create Order
  const handleCreateOrder = async () => {
    setLoading(true);
    try {
      const functions = getFunctions();
      const createOrder = httpsCallable(functions, 'createSeamlessOrder');
      
      const result = await createOrder({
        listingId,
        orderAmount: amount,
        customerEmail: user.email,
        customerPhone: user.phoneNumber,
        customerName: user.displayName,
      });

      const data = result.data as any;
      setPaymentSessionId(data.paymentSessionId);
      setOrderId(data.orderId);
      
      console.log('Order created:', data.orderId);
    } catch (error) {
      console.error('Failed to create order:', error);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Process Payment (UPI example)
  const handlePayWithUPI = async (upiId: string) => {
    setLoading(true);
    try {
      const functions = getFunctions();
      const processPayment = httpsCallable(functions, 'processSeamlessPayment');
      
      const result = await processPayment({
        paymentSessionId,
        paymentMethod: {
          type: 'upi',
          upi: {
            channel: 'collect',
            upi_id: upiId,
          },
        },
      });

      const data = result.data as any;
      
      if (data.paymentStatus === 'SUCCESS') {
        // Payment successful - redirect to success page
        window.location.href = `/payment/success?order_id=${orderId}`;
      } else if (data.paymentStatus === 'PENDING') {
        // Payment pending - show waiting message
        alert('Payment is being processed. Please wait...');
      } else {
        // Payment failed
        alert('Payment failed: ' + data.paymentMessage);
      }
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-checkout">
      {!paymentSessionId ? (
        <button onClick={handleCreateOrder} disabled={loading}>
          {loading ? 'Creating Order...' : 'Proceed to Payment'}
        </button>
      ) : (
        <div className="payment-methods">
          <h3>Pay ₹{amount}</h3>
          <input 
            type="text" 
            placeholder="Enter UPI ID (e.g., user@upi)"
            onBlur={(e) => handlePayWithUPI(e.target.value)}
          />
        </div>
      )}
    </div>
  );
};
```

### Payment Success Page

```typescript
import { useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

const PaymentSuccess: React.FC = () => {
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const orderId = urlParams.get('order_id');

      if (!orderId) return;

      try {
        const functions = getFunctions();
        const getPayments = httpsCallable(functions, 'getOrderPayments');
        
        const result = await getPayments({ orderId });
        const data = result.data as any;
        
        setPaymentDetails(data.payments[0]);
      } catch (error) {
        console.error('Failed to verify payment:', error);
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, []);

  if (loading) return <div>Verifying payment...</div>;

  if (paymentDetails?.paymentStatus === 'SUCCESS') {
    return (
      <div className="success">
        <h1>Payment Successful!</h1>
        <p>Amount: ₹{paymentDetails.paymentAmount}</p>
        <p>Payment ID: {paymentDetails.cfPaymentId}</p>
      </div>
    );
  }

  return <div className="failed">Payment verification failed</div>;
};
```

---

## Webhook Integration

The webhook handler (`cashfreeWebhookV2`) automatically processes payment status updates from Cashfree.

**Webhook URL:** `https://api.andamanbazaar.in/cashfree/webhook`

**Events Handled:**
- `PAYMENT_SUCCESS_WEBHOOK` → Marks listing as sold, creates purchase record
- `PAYMENT_FAILED_WEBHOOK` → Releases listing reservation
- `PAYMENT_USER_DROPPED_WEBHOOK` → Releases listing reservation

**Security:**
- Verifies `x-webhook-signature` header
- Validates `x-webhook-timestamp` header
- Idempotent processing (safe to receive duplicates)
- All events logged in `paymentEvents` collection

---

## Firestore Schema

### payments Collection

```typescript
{
  orderId: string;
  cfOrderId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  orderAmount: number;
  orderCurrency: string;
  orderStatus: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  paymentSessionId: string;
  paymentId?: string;
  paymentAmount?: number;
  paymentTime?: Timestamp;
  customerEmail: string;
  customerPhone?: string;
  customerName?: string;
  listingTitle: string;
  listingPrice: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;
}
```

### paymentEvents Collection

```typescript
{
  eventId: string;
  type: string;
  timestamp: string;
  orderId: string;
  orderStatus: string;
  paymentStatus?: string;
  paymentId?: string;
  signature: string;
  payload: any;
  processedAt: Timestamp;
  processingStatus: 'SUCCESS' | 'FAILED' | 'DUPLICATE';
  errorMessage?: string;
}
```

---

## Testing

### Sandbox Mode

Set `CASHFREE_ENV=sandbox` in Cloud Functions environment.

**Test UPI IDs:**
- Success: `success@upi`
- Failure: `failure@upi`

**Test Cards:**
- Success: `4111111111111111` (CVV: 123, Expiry: 12/25)
- Failure: `4000000000000002`

### Testing Checklist

- [ ] Order creation with valid listing
- [ ] Order creation with invalid listing (should fail)
- [ ] Self-purchase prevention
- [ ] UPI payment success flow
- [ ] UPI payment failure flow
- [ ] Card payment (requires PCI DSS flag)
- [ ] Webhook signature verification
- [ ] Duplicate webhook handling
- [ ] Order expiry and reservation cleanup
- [ ] Payment status verification after redirect

---

## Production Deployment

### Prerequisites

1. **Enable S2S flag** - Contact care@cashfree.com
2. **Enable PCI DSS flag** (for cards) - Contact care@cashfree.com
3. **Set environment variables:**
   ```bash
   firebase functions:config:set cashfree.env="production"
   ```

4. **Verify secrets are set:**
   ```bash
   firebase functions:secrets:access CASHFREE_APP_ID
   firebase functions:secrets:access CASHFREE_SECRET_KEY
   firebase functions:secrets:access CASHFREE_WEBHOOK_SECRET
   firebase functions:secrets:access GEMINI_API_KEY
   ```

5. **Deploy functions:**
   ```bash
   firebase deploy --only functions
   ```

### Monitoring

- Check Cloud Functions logs for errors
- Monitor `paymentEvents` collection for webhook processing
- Set up alerts for failed payments
- Track payment success rate in Analytics

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `unauthenticated` | User not logged in | Redirect to login |
| `not-found` | Listing/Order not found | Verify IDs |
| `failed-precondition` | Listing not available | Show error message |
| `permission-denied` | User doesn't own order | Security violation |
| `invalid-argument` | Missing required fields | Validate input |

### Retry Logic

- **Order creation:** Retry up to 3 times with exponential backoff
- **Payment processing:** Do NOT retry automatically (user action required)
- **Status verification:** Safe to retry anytime

---

## Security Best Practices

1. ✅ **Never expose API keys** to frontend
2. ✅ **Always verify webhook signatures**
3. ✅ **Validate user ownership** before operations
4. ✅ **Use HTTPS only** for all endpoints
5. ✅ **Log all transactions** for audit trail
6. ✅ **Implement rate limiting** on Cloud Functions
7. ✅ **Monitor for suspicious activity**
8. ✅ **Rotate secrets regularly**

---

*Last updated: March 2026*
*Version: 1.0*
*API Version: 2023-08-01*
