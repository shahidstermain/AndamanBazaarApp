# Cashfree Payment State Machine

## Overview

This document describes the complete payment state machine for AndamanBazaar's Cashfree integration through Firebase Cloud Functions. The system ensures payment integrity, provides idempotent operations, and maintains audit trails for all payment events.

## Architecture

```
Frontend → Firebase Functions → Cashfree API → Webhook → Firebase Functions → Firestore
    ↑                                ↓                    ↓              ↑
    └───── Status Polling ←──────────┘                    └─────── Events ─────┘
```

## Payment States

### Order States

| State       | Description                       | Trigger           | Next States              |
| ----------- | --------------------------------- | ----------------- | ------------------------ |
| `ACTIVE`    | Order created, awaiting payment   | createOrder()     | PAID, EXPIRED, CANCELLED |
| `PAID`      | Payment completed successfully    | Webhook SUCCESS   | -                        |
| `EXPIRED`   | Order expired (15 minutes)        | Webhook EXPIRED   | -                        |
| `CANCELLED` | Order cancelled by user or system | Webhook CANCELLED | -                        |

### Payment States

| State       | Description                               | Trigger           | Next States                |
| ----------- | ----------------------------------------- | ----------------- | -------------------------- |
| `PENDING`   | Payment initiated, awaiting completion    | createOrder()     | SUCCESS, FAILED, CANCELLED |
| `SUCCESS`   | Payment successful                        | Webhook SUCCESS   | -                          |
| `FAILED`    | Payment failed (insufficient funds, etc.) | Webhook FAILED    | -                          |
| `CANCELLED` | Payment cancelled by user                 | Webhook CANCELLED | -                          |

## State Flow Diagram

```
[Frontend Request]
        ↓
   [createOrder()]
        ↓
   [Order: ACTIVE]
   [Payment: PENDING]
        ↓
   [Payment Session Created]
        ↓
   [User Payment Attempt]
        ↓
   ┌─────────────────┐
   │                 │
   ↓                 ↓
[SUCCESS]         [FAILED/CANCELLED]
   ↓                 ↓
[Order: PAID]      [Order: CANCELLED]
[Payment: SUCCESS] [Payment: FAILED/CANCELLED]
   ↓                 ↓
[Listing: SOLD]     [Listing: ACTIVE]
[Notification]      [Reservation Released]
```

## Firestore Schema

### payments Collection

```typescript
interface PaymentOrder {
  orderId: string; // Primary key
  cfOrderId: string; // Cashfree order ID
  listingId: string; // Listing being purchased
  buyerId: string; // Firebase Auth UID
  sellerId: string; // Firebase Auth UID
  orderAmount: number; // Amount in INR
  orderCurrency: string; // "INR"
  orderStatus: "ACTIVE" | "PAID" | "EXPIRED" | "CANCELLED";
  paymentStatus: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
  customerEmail: string;
  customerPhone?: string;
  paymentSessionId: string; // Cashfree session ID
  orderToken: string; // Cashfree order token
  orderExpiryTime: string; // ISO timestamp
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSyncedAt?: Timestamp; // Last sync with Cashfree
  listingTitle?: string;
  listingPrice?: number;
  duplicatePreventionKey?: string; // Idempotency key
  cashfreeResponse?: any; // Raw Cashfree response
}
```

### paymentEvents Collection

```typescript
interface PaymentEvent {
  eventId: string; // Primary key
  type: string; // Event type
  timestamp: string; // Event timestamp
  orderId: string;
  cfOrderId?: string;
  listingId?: string;
  buyerId?: string;
  sellerId?: string;
  orderAmount?: number;
  signature: string; // Webhook signature
  payload: any; // Raw webhook payload
  processedAt: Timestamp;
  processingStatus: "SUCCESS" | "FAILED" | "DUPLICATE";
  errorMessage?: string;
  ip?: string;
  userAgent?: string;
}
```

### purchases Collection

```typescript
interface Purchase {
  id: string; // Primary key
  orderId: string; // Payment order ID
  cfOrderId: string; // Cashfree order ID
  listingId: string; // Purchased listing
  buyerId: string; // Buyer UID
  sellerId: string; // Seller UID
  purchaseAmount: number; // Amount paid
  purchaseCurrency: string; // "INR"
  paymentId?: string; // Cashfree payment ID
  paymentMethod: "cashfree"; // Payment method
  purchaseStatus: "completed"; // Status
  purchaseAt: Timestamp; // Purchase timestamp
  createdAt: Timestamp; // Record creation
}
```

## API Endpoints

### 1. createOrder (HTTPS Callable)

**Purpose**: Creates a new payment order with Cashfree

**Input**:

```typescript
{
  listingId: string;
  customerEmail: string;
  customerPhone?: string;
  orderNotes?: string;
  duplicatePreventionKey?: string;  // For idempotency
}
```

**Output**:

```typescript
{
  success: boolean;
  orderId: string;
  paymentSessionId: string;
  cfOrderId: string;
  orderExpiryTime: string;
  error?: string;
}
```

**Security**:

- Requires Firebase Auth token
- Validates listing exists and is available
- Prevents self-purchase
- Validates email format
- Implements duplicate prevention

**Side Effects**:

- Creates order in Cashfree
- Stores payment record in Firestore
- Reserves listing for 15 minutes
- Logs creation event

### 2. cashfreeWebhook (HTTPS Trigger)

**Purpose**: Handles Cashfree webhook events

**Input**: Cashfree webhook payload with signature

**Output**: HTTP response with processing status

**Security**:

- Validates webhook signature
- Idempotent processing
- Logs all events

**Event Types Handled**:

- `PAYMENT_SUCCESS` / `ORDER_PAID`
- `PAYMENT_FAILED` / `ORDER_FAILED`
- `PAYMENT_CANCELLED` / `ORDER_CANCELLED`
- `ORDER_EXPIRED`

**Side Effects**:

- Updates payment status
- Marks listing as sold (on success)
- Releases reservation (on failure/cancellation)
- Creates purchase record
- Sends notifications
- Logs event

### 3. checkPaymentStatus (HTTPS Callable)

**Purpose**: Allows polling for payment status

**Input**:

```typescript
{
  orderId: string;
}
```

**Output**:

```typescript
{
  success: boolean;
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  orderAmount: number;
  orderCurrency: string;
  paymentId?: string;
  paymentAmount?: number;
  paymentTime?: string;
  listingId?: string;
  listingTitle?: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
}
```

**Security**:

- Requires Firebase Auth token
- Only buyer can check their own orders
- Syncs with Cashfree API

**Side Effects**:

- Updates Firestore if status changed
- Handles status change side effects
- Logs sync events

## Idempotency and Safety

### Duplicate Prevention

1. **Order Creation**: Uses `duplicatePreventionKey` to prevent duplicate orders
2. **Webhook Processing**: Uses event timestamp + type to prevent duplicate processing
3. **Status Sync**: Updates only if status actually changed

### Atomic Operations

- All related Firestore updates use batch operations
- Webhook processing is atomic - either all updates succeed or none
- Listing reservations are released on payment failure

### Error Handling

- All functions have comprehensive error handling
- Failed operations are logged for debugging
- Reservations are cleaned up on order creation failure
- Webhook failures don't affect Cashfree processing

## Security Considerations

### Server-Side Only

- All Cashfree API calls happen server-side
- Secret keys stored in Firebase Functions environment
- No secret keys exposed to frontend

### Input Validation

- All inputs validated before processing
- Listing existence and availability verified
- User authorization checked for all operations

### Signature Verification

- All webhook signatures verified with secret key
- Invalid signatures rejected immediately
- Signature verification logged for audit

## Monitoring and Auditing

### Event Logging

- All payment events logged to `paymentEvents`
- Includes IP, user agent, and processing status
- Failed events preserved for debugging

### Health Checks

- Webhook health check endpoint
- Configuration validation
- Connectivity checks

### Metrics

- Order creation success/failure rates
- Webhook processing times
- Status sync frequencies
- Error rates and types

## Frontend Integration

### Payment Flow

1. User clicks "Buy Now" on listing
2. Frontend calls `createOrder()` with listing details
3. Frontend receives payment session ID
4. Frontend redirects to Cashfree payment page
5. User completes payment
6. Frontend polls `checkPaymentStatus()` or waits for webhook
7. Frontend updates UI based on payment status

### Error Handling

- Handle network errors gracefully
- Show user-friendly error messages
- Implement retry logic for status checks
- Fallback to manual status checking

## Testing

### Unit Tests

- Webhook signature validation
- State transition logic
- Input validation
- Error handling

### Integration Tests

- End-to-end payment flow
- Webhook processing
- Status synchronization
- Error scenarios

### Load Testing

- Concurrent order creation
- High-volume webhook processing
- Database performance under load

## Troubleshooting

### Common Issues

1. **Order Creation Fails**
   - Check listing availability
   - Verify user permissions
   - Check Cashfree credentials

2. **Webhook Not Received**
   - Verify webhook URL configuration
   - Check signature verification
   - Review Cashfree webhook settings

3. **Status Sync Issues**
   - Check Cashfree API connectivity
   - Verify order ID format
   - Review rate limiting

### Debugging Tools

- Firestore event logs
- Cloud Functions logs
- Cashfree dashboard
- Payment status debugging endpoint

## Performance Considerations

### Optimization

- Use Firestore indexes for payment queries
- Implement caching for status checks
- Batch webhook processing if needed
- Optimize reservation cleanup

### Scaling

- Horizontal scaling of Cloud Functions
- Database sharding for high volume
- CDN for static assets
- Load balancing for webhook endpoints

## Compliance and Regulations

### PCI DSS

- No card data stored in our systems
- All sensitive data handled by Cashfree
- Regular security audits

### Data Protection

- GDPR compliance for user data
- Data retention policies
- Secure data transmission

### Financial Regulations

- Payment records retention
- Audit trail maintenance
- Regulatory reporting

## Future Enhancements

### Planned Features

1. **Multiple Payment Methods**: Support for other payment providers
2. **Subscription Payments**: Recurring payment support
3. **Refund Management**: Automated refund processing
4. **Analytics Dashboard**: Payment analytics and insights
5. **Fraud Detection**: Advanced fraud prevention

### Technical Improvements

1. **Event Sourcing**: Complete event-driven architecture
2. **Microservices**: Separate payment service
3. **Real-time Updates**: WebSocket for instant status updates
4. **Mobile SDK**: Native mobile payment integration
5. **Blockchain Integration**: Cryptocurrency payments

---

## Quick Reference

### Environment Variables

```bash
# Cashfree Configuration
CASHFREE_ENV=sandbox|production
CASHFREE_APP_ID=your_app_id
CASHFREE_SECRET_KEY=your_secret_key
CASHFREE_WEBHOOK_SECRET=your_webhook_secret

# Firebase Configuration
FRONTEND_URL=https://your-app.com
FUNCTIONS_URL=https://your-region-project.cloudfunctions.net
```

### Key Functions

- `createOrder()` - Create payment order
- `checkPaymentStatus()` - Poll payment status
- `getPaymentHistory()` - Get user's payment history
- `getPaymentDetails()` - Get specific payment details
- `cashfreeWebhook()` - Handle webhook events
- `webhookHealthCheck()` - Health check endpoint

### State Transitions

```
PENDING → SUCCESS (Payment completed)
PENDING → FAILED (Payment failed)
PENDING → CANCELLED (User cancelled)
ACTIVE → EXPIRED (Order expired)
```

### Important Notes

- All amounts are in INR
- Orders expire after 15 minutes
- Webhooks are the primary source of truth
- Status polling is for user experience only
- All operations are idempotent
- Comprehensive audit trail maintained
