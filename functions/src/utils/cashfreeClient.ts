import { Cashfree } from 'cashfree-pg';
import { logger } from 'firebase-functions/v2';
import { CashfreeWebhookEvent, verifyWebhookSignature as verifySig, parseWebhookEvent as parseEvent } from './webhookUtils';
import { getRequiredEnv, SECRET_NAMES } from './secrets';

// Re-export the webhook functions for backward compatibility
export { verifySig as verifyWebhookSignature, parseEvent as parseWebhookEvent };
export type { CashfreeWebhookEvent };

// Initialize Cashfree client with environment-specific configuration
const getCashfreeClient = (): Cashfree => {
  const environment = process.env.CASHFREE_ENV || 'sandbox';
  const appId = getRequiredEnv(SECRET_NAMES.CASHFREE_APP_ID);
  const secretKey = getRequiredEnv(SECRET_NAMES.CASHFREE_SECRET_KEY);

  return new Cashfree({
    environment: environment as 'production' | 'sandbox',
    appId,
    secretKey,
  });
};

// Order creation interface
export interface CreateOrderRequest {
  orderId: string;
  orderAmount: number;
  orderCurrency: string;
  customerDetails: {
    customerId: string;
    customerEmail: string;
    customerPhone?: string;
  };
  orderNotes?: string;
  orderMeta?: {
    return_url?: string;
    notify_url?: string;
    payment_methods?: string;
  };
}

// Order response interface
export interface CreateOrderResponse {
  orderId: string;
  orderAmount: number;
  orderCurrency: string;
  orderStatus: string;
  orderToken: string;
  paymentSessionId: string;
  cfOrderId: string;
  orderExpiryTime: string;
  payments?: Array<{
    cfPaymentId: string;
    orderAmount: number;
    paymentStatus: string;
    paymentAmount: number;
    paymentTime: string;
    paymentCompletionTime: string;
  }>;
}

// Create order with Cashfree API
export const createCashfreeOrder = async (request: CreateOrderRequest): Promise<CreateOrderResponse> => {
  try {
    const cashfree = getCashfreeClient();
    
    const orderRequest = {
      order_id: request.orderId,
      order_amount: request.orderAmount,
      order_currency: request.orderCurrency,
      customer_details: {
        customer_id: request.customerDetails.customerId,
        customer_email: request.customerDetails.customerEmail,
        customer_phone: request.customerDetails.customerPhone,
      },
      order_notes: request.orderNotes,
      order_meta: request.orderMeta,
    };

    logger.info(`Creating Cashfree order: ${request.orderId}`, { orderRequest });
    
    const response = await cashfree.createOrder(orderRequest);
    
    logger.info(`Cashfree order created successfully: ${response.order_id}`, {
      orderId: response.order_id,
      orderToken: response.order_token,
    });

    return {
      orderId: response.order_id,
      orderAmount: response.order_amount,
      orderCurrency: response.order_currency,
      orderStatus: response.order_status,
      orderToken: response.order_token,
      paymentSessionId: response.order_token,
      cfOrderId: response.cf_order_id,
      orderExpiryTime: response.order_expiry_time,
      payments: response.payments,
    };
  } catch (error) {
    logger.error(`Failed to create Cashfree order: ${request.orderId}`, error);
    throw new Error(`Cashfree order creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Get order status from Cashfree
export const getCashfreeOrderStatus = async (orderId: string): Promise<CreateOrderResponse> => {
  try {
    const cashfree = getCashfreeClient();
    
    logger.info(`Fetching Cashfree order status: ${orderId}`);
    
    const response = await cashfree.getOrderStatus(orderId);
    
    logger.info(`Cashfree order status retrieved: ${orderId}`, {
      orderStatus: response.order_status,
      paymentStatus: response.payments?.[0]?.payment_status,
    });

    return {
      orderId: response.order_id,
      orderAmount: response.order_amount,
      orderCurrency: response.order_currency,
      orderStatus: response.order_status,
      orderToken: response.order_token,
      paymentSessionId: response.order_token,
      cfOrderId: response.cf_order_id,
      orderExpiryTime: response.order_expiry_time,
      payments: response.payments,
    };
  } catch (error) {
    logger.error(`Failed to fetch Cashfree order status: ${orderId}`, error);
    throw new Error(`Cashfree order status fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Refund order
export interface RefundRequest {
  orderId: string;
  refundAmount: number;
  refundId?: string;
  refundReason?: string;
}

export interface RefundResponse {
  refundId: string;
  orderId: string;
  refundAmount: number;
  refundStatus: string;
  refundProcessedAt?: string;
}

export const createRefund = async (request: RefundRequest): Promise<RefundResponse> => {
  try {
    const cashfree = getCashfreeClient();
    
    const refundRequest = {
      order_id: request.orderId,
      refund_amount: request.refundAmount,
      refund_id: request.refundId,
      refund_reason: request.refundReason,
    };

    logger.info(`Creating refund for order: ${request.orderId}`, { refundRequest });
    
    const response = await cashfree.refundOrder(refundRequest);
    
    logger.info(`Refund created successfully: ${response.refund_id}`, {
      refundId: response.refund_id,
      refundStatus: response.refund_status,
    });

    return {
      refundId: response.refund_id,
      orderId: response.order_id,
      refundAmount: response.refund_amount,
      refundStatus: response.refund_status,
      refundProcessedAt: response.refund_processed_at,
    };
  } catch (error) {
    logger.error(`Failed to create refund for order: ${request.orderId}`, error);
    throw new Error(`Refund creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Export Cashfree client for advanced usage
export { getCashfreeClient };
