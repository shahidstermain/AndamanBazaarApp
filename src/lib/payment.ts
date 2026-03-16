// ============================================================
// Payment Service Module
// Handles all payment-related operations for boosting listings
// ============================================================

import { auth } from './firebase';
import { getTier, BoostTierConfig } from './pricing';

// ===== INTERFACES =====

export interface BoostOrderRequest {
  listingId: string;
  tier: string;
  returnUrl?: string;
  notifyUrl?: string;
}

export interface BoostOrderResponse {
  success: boolean;
  orderId?: string;
  paymentSessionId?: string;
  paymentLink?: string;
  amount?: number;
  currency?: string;
  error?: string;
  message?: string;
}

export interface PaymentStatus {
  orderId: string;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  createdAt?: string;
  updatedAt?: string;
  failureReason?: string;
  refundReason?: string;
}

export interface PaymentVerificationResponse {
  success: boolean;
  status: PaymentStatus['status'];
  order?: PaymentStatus;
  error?: string;
}

// ===== PAYMENT SERVICE CLASS =====

export class PaymentService {
  private static instance: PaymentService;
  private readonly baseUrl: string;
  private readonly projectId: string;
  private readonly region: string;

  private constructor() {
    this.projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    this.region = import.meta.env.VITE_FIREBASE_REGION || 'us-central1';
    this.baseUrl = `https://${this.region}-${this.projectId}.cloudfunctions.net`;
  }

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  // ===== AUTHENTICATION =====

  private async getAuthToken(): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated. Please sign in to continue.');
    }
    return await user.getIdToken(true);
  }

  // ===== ORDER CREATION =====

  /**
   * Creates a new boost order with payment session
   */
  async createBoostOrder(request: BoostOrderRequest): Promise<BoostOrderResponse> {
    try {
      // Validate tier exists (client-side check only; server resolves price)
      const tierConfig = getTier(request.tier);
      
      // Get auth token
      const token = await this.getAuthToken();

      // Only send listing_id and tier — server resolves price securely
      const payload = {
        listing_id: request.listingId,
        tier: request.tier,
      };

      // Call the dedicated createBoostOrder Cloud Function
      const response = await fetch(`${this.baseUrl}/createBoostOrder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to create payment order');
      }

      return {
        success: true,
        orderId: data.order_id,
        paymentSessionId: data.payment_session_id,
        paymentLink: data.payment_link,
        amount: data.amount || tierConfig.priceInr,
        currency: data.currency || 'INR',
      };
    } catch (error) {
      console.error('Error creating boost order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment order',
      };
    }
  }

  // ===== PAYMENT VERIFICATION =====

  /**
   * Verifies payment status for an order
   */
  async verifyPayment(orderId: string): Promise<PaymentVerificationResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.baseUrl}/verifyBoostPayment?orderId=${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to verify payment');
      }

      return {
        success: true,
        status: data.status,
        order: data.order,
      };
    } catch (error) {
      console.error('Error verifying payment:', error);
      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Payment verification failed',
      };
    }
  }

  // ===== PAYMENT STATUS POLLING =====

  /**
   * Polls payment status until completion or timeout
   */
  async pollPaymentStatus(
    orderId: string,
    onStatusChange: (status: PaymentStatus['status']) => void,
    maxAttempts: number = 20,
    interval: number = 3000
  ): Promise<PaymentStatus['status']> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const verification = await this.verifyPayment(orderId);
        
        if (verification.success && verification.order) {
          const status = verification.order.status;
          onStatusChange(status);

          // Return if payment is complete (success or failure)
          if (status === 'paid' || status === 'failed' || status === 'refunded' || status === 'cancelled') {
            return status;
          }
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
      } catch (error) {
        console.error(`Payment status check attempt ${attempts + 1} failed:`, error);
        attempts++;
        
        if (attempts >= maxAttempts) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    throw new Error('Payment status verification timed out');
  }

  // ===== REDIRECT HANDLING =====

  /**
   * Redirects to payment gateway
   */
  redirectToPayment(paymentLink: string, paymentSessionId?: string): void {
    if (paymentLink) {
      window.location.href = paymentLink;
    } else if (paymentSessionId) {
      const cashfreeEnv = import.meta.env.VITE_CASHFREE_ENV || 'sandbox';
      const baseUrl = cashfreeEnv === 'production'
        ? 'https://payments.cashfree.com/pg/view/order'
        : 'https://sandbox.cashfree.com/pg/view/order';
      window.location.href = `${baseUrl}/${paymentSessionId}`;
    } else {
      throw new Error('No payment link or session ID available');
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Generates a unique order ID
   */
  private generateOrderId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `BOOST_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Formats amount for display
   */
  formatAmount(amountPaise: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amountPaise / 100);
  }

  /**
   * Validates payment request
   */
  private validateRequest(request: BoostOrderRequest): void {
    if (!request.listingId) {
      throw new Error('Listing ID is required');
    }
    if (!request.tier) {
      throw new Error('Boost tier is required');
    }
    if (!['spark', 'boost', 'power'].includes(request.tier)) {
      throw new Error('Invalid boost tier');
    }
  }

  // ===== ERROR HANDLING =====

  /**
   * Maps error codes to user-friendly messages
   */
  getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    const errorCode = error?.code || error?.error_code;
    const errorMessage = error?.message || error?.error;

    // Map common error codes
    switch (errorCode) {
      case 'PAYMENT_FAILED':
        return 'Payment failed. Please try again or use a different payment method.';
      case 'INSUFFICIENT_BALANCE':
        return 'Insufficient balance. Please check your account and try again.';
      case 'INVALID_CARD':
        return 'Invalid card details. Please check and try again.';
      case 'CARD_EXPIRED':
        return 'Your card has expired. Please use a different card.';
      case 'TRANSACTION_LIMIT':
        return 'Transaction limit exceeded. Please try with a smaller amount or contact your bank.';
      case 'NETWORK_ERROR':
        return 'Network error. Please check your connection and try again.';
      case 'ORDER_EXPIRED':
        return 'Payment session expired. Please try again.';
      default:
        return errorMessage || 'Payment failed. Please try again.';
    }
  }

  /**
   * Checks if error is retryable
   */
  isRetryableError(error: any): boolean {
    const retryableCodes = [
      'NETWORK_ERROR',
      'TIMEOUT',
      'SERVER_ERROR',
      'TEMPORARY_FAILURE',
    ];

    const errorCode = error?.code || error?.error_code;
    return retryableCodes.includes(errorCode) || 
           error?.message?.includes('timeout') ||
           error?.message?.includes('network');
  }
}

// ===== EXPORTS =====

export const paymentService = PaymentService.getInstance();

// Convenience functions
export const createBoostOrder = (request: BoostOrderRequest) => 
  paymentService.createBoostOrder(request);

export const verifyBoostPayment = (orderId: string) => 
  paymentService.verifyPayment(orderId);

export const pollBoostPaymentStatus = (
  orderId: string,
  onStatusChange: (status: PaymentStatus['status']) => void,
  maxAttempts?: number,
  interval?: number
) => paymentService.pollPaymentStatus(orderId, onStatusChange, maxAttempts, interval);

export const redirectToPaymentGateway = (paymentLink: string, paymentSessionId?: string) => 
  paymentService.redirectToPayment(paymentLink, paymentSessionId);

export default paymentService;
