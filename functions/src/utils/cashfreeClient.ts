import {
  Cashfree,
  CreateOrderRequest as CashfreeCreateOrderRequest,
  OrderCreateRefundRequest,
  PaymentEntity,
} from "cashfree-pg";
import { logger } from "firebase-functions/v2";
import {
  CashfreeWebhookEvent,
  verifyWebhookSignature as verifySig,
  parseWebhookEvent as parseEvent,
} from "./webhookUtils";
import { getRequiredEnv, SECRET_NAMES } from "./secrets";

// Re-export the webhook functions for backward compatibility
export { verifySig as verifyWebhookSignature, parseEvent as parseWebhookEvent };
export type { CashfreeWebhookEvent };

// Initialize Cashfree client with environment-specific configuration
const initializeCashfree = (): void => {
  Cashfree.XClientId = getRequiredEnv(SECRET_NAMES.CASHFREE_APP_ID);
  Cashfree.XClientSecret = getRequiredEnv(SECRET_NAMES.CASHFREE_SECRET_KEY);
  Cashfree.XEnvironment =
    process.env.CASHFREE_ENV === "production"
      ? Cashfree.Environment.PRODUCTION
      : Cashfree.Environment.SANDBOX;
  Cashfree.XApiVersion = "2025-01-01";
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

const mapPaymentEntity = (payment: PaymentEntity) => ({
  cfPaymentId: String(payment.cf_payment_id ?? ""),
  orderAmount: payment.order_amount ?? 0,
  paymentStatus: payment.payment_status ?? "PENDING",
  paymentAmount: payment.payment_amount ?? 0,
  paymentTime: payment.payment_time ?? "",
  paymentCompletionTime: payment.payment_completion_time ?? "",
});

// Create order with Cashfree API
export const createCashfreeOrder = async (
  request: CreateOrderRequest,
): Promise<CreateOrderResponse> => {
  try {
    initializeCashfree();

    const orderRequest: CashfreeCreateOrderRequest = {
      order_id: request.orderId,
      order_amount: request.orderAmount,
      order_currency: request.orderCurrency,
      customer_details: {
        customer_id: request.customerDetails.customerId,
        customer_email: request.customerDetails.customerEmail,
        customer_phone: request.customerDetails.customerPhone ?? "",
      },
      order_note: request.orderNotes,
      order_meta: request.orderMeta,
    };

    logger.info(`Creating Cashfree order: ${request.orderId}`, {
      orderRequest,
    });

    const response = await Cashfree.PGCreateOrder("2025-01-01", orderRequest);
    const responseData = response.data;

    logger.info(
      `Cashfree order created successfully: ${responseData.cf_order_id}`,
      {
        orderId: responseData.cf_order_id,
        orderStatus: responseData.order_status,
      },
    );

    return {
      orderId: responseData.order_id ?? request.orderId,
      orderAmount: responseData.order_amount ?? request.orderAmount,
      orderCurrency: responseData.order_currency ?? request.orderCurrency,
      orderStatus: responseData.order_status ?? "ACTIVE",
      orderToken: responseData.payment_session_id ?? "",
      paymentSessionId: responseData.payment_session_id ?? "",
      cfOrderId: String(responseData.cf_order_id ?? ""),
      orderExpiryTime: responseData.order_expiry_time ?? "",
    };
  } catch (error) {
    logger.error(`Failed to create Cashfree order: ${request.orderId}`, error);
    throw new Error(
      `Cashfree order creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

// Get order status from Cashfree
export const getCashfreeOrderStatus = async (
  orderId: string,
): Promise<CreateOrderResponse> => {
  try {
    initializeCashfree();

    logger.info(`Fetching Cashfree order status: ${orderId}`);

    const response = await Cashfree.PGFetchOrder("2025-01-01", orderId);
    const responseData = response.data;
    const paymentsResponse = await Cashfree.PGOrderFetchPayments(
      "2025-01-01",
      orderId,
    );
    const payments = (paymentsResponse.data ?? []).map(mapPaymentEntity);

    logger.info(`Cashfree order status retrieved: ${orderId}`, {
      orderStatus: responseData.order_status,
      paymentStatus: payments[0]?.paymentStatus,
    });

    return {
      orderId: responseData.order_id ?? orderId,
      orderAmount: responseData.order_amount ?? 0,
      orderCurrency: responseData.order_currency ?? "INR",
      orderStatus: responseData.order_status ?? "ACTIVE",
      orderToken: responseData.payment_session_id ?? "",
      paymentSessionId: responseData.payment_session_id ?? "",
      cfOrderId: String(responseData.cf_order_id ?? ""),
      orderExpiryTime: responseData.order_expiry_time ?? "",
      payments,
    };
  } catch (error) {
    logger.error(`Failed to fetch Cashfree order status: ${orderId}`, error);
    throw new Error(
      `Cashfree order status fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
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

export const createRefund = async (
  request: RefundRequest,
): Promise<RefundResponse> => {
  try {
    initializeCashfree();

    const refundRequest: OrderCreateRefundRequest = {
      refund_amount: request.refundAmount,
      refund_id: request.refundId ?? `refund_${request.orderId}_${Date.now()}`,
      refund_note: request.refundReason,
    };

    logger.info(`Creating refund for order: ${request.orderId}`, {
      refundRequest,
    });

    const response = await Cashfree.PGOrderCreateRefund(
      "2025-01-01",
      request.orderId,
      refundRequest,
    );
    const responseData = response.data;

    logger.info(`Refund created successfully: ${responseData.cf_refund_id}`, {
      refundId: responseData.cf_refund_id,
      refundStatus: responseData.refund_status,
    });

    return {
      refundId: responseData.cf_refund_id ?? refundRequest.refund_id,
      orderId: responseData.order_id ?? request.orderId,
      refundAmount: responseData.refund_amount ?? request.refundAmount,
      refundStatus: responseData.refund_status ?? "PENDING",
      refundProcessedAt: responseData.processed_at,
    };
  } catch (error) {
    logger.error(
      `Failed to create refund for order: ${request.orderId}`,
      error,
    );
    throw new Error(
      `Refund creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

// Export Cashfree class for advanced usage
export { Cashfree, initializeCashfree };
