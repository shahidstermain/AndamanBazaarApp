import { auth as firebaseAuth } from './firebase';
import { logger } from './logger';

// ===== FUNCTION PROVIDER TYPES =====

// ===== INTERFACES =====

export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerPhone: string;
  listingId: string;
  paymentMethod: 'upi' | 'card' | 'netbanking';
}

export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  paymentUrl?: string;
  error?: string;
  requiresAction?: boolean;
  actionData?: any;
}

export interface LocationVerificationRequest {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export interface LocationVerificationResponse {
  success: boolean;
  verified: boolean;
  distance?: number;
  city?: string;
  error?: string;
}

export interface AiModerationRequest {
  content: string;
  contentType: 'listing' | 'chat' | 'profile';
  userId: string;
}

export interface AiModerationResponse {
  approved: boolean;
  confidence: number;
  flaggedCategories: string[];
  suggestions: string[];
  error?: string;
}

export interface InvoiceRequest {
  orderId: string;
  buyerId: string;
  sellerId: string;
  items: Array<{
    listingId: string;
    title: string;
    price: number;
    quantity: number;
  }>;
  totalAmount: number;
  buyerInfo: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
}

export interface InvoiceResponse {
  success: boolean;
  invoiceId?: string;
  invoiceUrl?: string;
  invoiceNumber?: string;
  error?: string;
}

// ===== PAYMENT FUNCTIONS =====

export const createPayment = async (request: PaymentRequest): Promise<PaymentResponse> => {
  try {
    const fnUrl = import.meta.env.VITE_FIREBASE_CREATE_PAYMENT_FUNCTION;
    if (!fnUrl) {
      logger.error('Firebase payment function URL not configured');
      return { success: false, error: 'Configuration error' };
    }
    const response = await fetch(fnUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getFirebaseAuthToken()}` },
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      logger.error('Payment function error', { status: response.statusText });
      return { success: false, error: response.statusText };
    }
    return await response.json();
  } catch (error) {
    logger.error('Error creating payment', error);
    return { success: false, error: error instanceof Error ? error.message : 'Payment creation failed' };
  }
};

export const verifyPayment = async (paymentId: string): Promise<PaymentResponse> => {
  try {
    const fnUrl = import.meta.env.VITE_FIREBASE_VERIFY_PAYMENT_FUNCTION;
    if (!fnUrl) {
      logger.error('Firebase verify payment function URL not configured');
      return { success: false, error: 'Configuration error' };
    }
    const response = await fetch(`${fnUrl}?paymentId=${paymentId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${await getFirebaseAuthToken()}` }
    });
    if (!response.ok) {
      logger.error('Verify payment error', { status: response.statusText });
      return { success: false, error: response.statusText };
    }
    return await response.json();
  } catch (error) {
    logger.error('Error verifying payment', error);
    return { success: false, error: error instanceof Error ? error.message : 'Payment verification failed' };
  }
};

// ===== LOCATION VERIFICATION FUNCTIONS =====

export const verifyLocation = async (request: LocationVerificationRequest): Promise<LocationVerificationResponse> => {
  try {
    const fnUrl = import.meta.env.VITE_FIREBASE_VERIFY_LOCATION_FUNCTION;
    if (!fnUrl) {
      logger.error('Firebase location verification function URL not configured');
      return { success: false, verified: false, error: 'Configuration error' };
    }
    const response = await fetch(fnUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getFirebaseAuthToken()}` },
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      logger.error('Location verification error', { status: response.statusText });
      return { success: false, verified: false, error: response.statusText };
    }
    return await response.json();
  } catch (error) {
    logger.error('Error verifying location', error);
    return { success: false, verified: false, error: error instanceof Error ? error.message : 'Location verification failed' };
  }
};

// ===== AI MODERATION FUNCTIONS =====

export const moderateContent = async (request: AiModerationRequest): Promise<AiModerationResponse> => {
  try {
    const fnUrl = import.meta.env.VITE_FIREBASE_MODERATE_CONTENT_FUNCTION;
    if (!fnUrl) {
      logger.error('Firebase content moderation function URL not configured');
      return { approved: false, confidence: 0, flaggedCategories: [], suggestions: [], error: 'Configuration error' };
    }
    const response = await fetch(fnUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getFirebaseAuthToken()}` },
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      logger.error('Content moderation error', { status: response.statusText });
      return { approved: false, confidence: 0, flaggedCategories: [], suggestions: [], error: response.statusText };
    }
    return await response.json();
  } catch (error) {
    logger.error('Error moderating content', error);
    return { approved: false, confidence: 0, flaggedCategories: [], suggestions: [], error: error instanceof Error ? error.message : 'Content moderation failed' };
  }
};

// ===== INVOICE FUNCTIONS =====

export const createInvoice = async (request: InvoiceRequest): Promise<InvoiceResponse> => {
  try {
    const fnUrl = import.meta.env.VITE_FIREBASE_CREATE_INVOICE_FUNCTION;
    if (!fnUrl) {
      logger.error('Firebase invoice creation function URL not configured');
      return { success: false, error: 'Configuration error' };
    }
    const response = await fetch(fnUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${await getFirebaseAuthToken()}` },
      body: JSON.stringify(request)
    });
    if (!response.ok) {
      logger.error('Invoice creation error', { status: response.statusText });
      return { success: false, error: response.statusText };
    }
    return await response.json();
  } catch (error) {
    logger.error('Error creating invoice', error);
    return { success: false, error: error instanceof Error ? error.message : 'Invoice creation failed' };
  }
};

// ===== WEBHOOK HANDLING =====

export const handleWebhook = async (webhookType: string, payload: any): Promise<{ success: boolean; processed: boolean }> => {
  try {
    const fnUrl = import.meta.env.VITE_FIREBASE_WEBHOOK_FUNCTION;
    if (!fnUrl) {
      logger.error('Firebase webhook function URL not configured');
      return { success: false, processed: false };
    }
    const response = await fetch(fnUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Type': webhookType },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      logger.error('Webhook handling error', { status: response.statusText });
      return { success: false, processed: false };
    }
    return await response.json();
  } catch (error) {
    logger.error('Error handling webhook', error);
    return { success: false, processed: false };
  }
};

// ===== UTILITY FUNCTIONS =====

export async function getFirebaseAuthToken(): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('User not authenticated');
  return await user.getIdToken();
};

// ===== BATCH OPERATIONS =====

export const batchModerateContent = async (requests: AiModerationRequest[]): Promise<AiModerationResponse[]> => {
  const promises = requests.map(request => moderateContent(request));
  return await Promise.all(promises);
};

export const batchCreateInvoices = async (requests: InvoiceRequest[]): Promise<InvoiceResponse[]> => {
  const promises = requests.map(request => createInvoice(request));
  return await Promise.all(promises);
};

// ===== HEALTH CHECK =====

export const checkFunctionHealth = async (): Promise<{ provider: string; healthy: boolean; latency?: number }> => {
  const startTime = Date.now();
  try {
    const healthFunction = import.meta.env.VITE_FIREBASE_HEALTH_FUNCTION;
    if (!healthFunction) return { provider: 'firebase', healthy: false };
    const response = await fetch(healthFunction, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${await getFirebaseAuthToken()}` }
    });
    return { provider: 'firebase', healthy: response.ok, latency: Date.now() - startTime };
  } catch (error) {
    logger.error('Health check failed', error);
    return { provider: 'firebase', healthy: false };
  }
};

export default {
  createPayment,
  verifyPayment,
  verifyLocation,
  moderateContent,
  createInvoice,
  handleWebhook,
  batchModerateContent,
  batchCreateInvoices,
  checkFunctionHealth
}
