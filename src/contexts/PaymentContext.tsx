// ============================================================
// Payment Context
// Manages payment state and operations across the application
// ============================================================

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from "react";
import {
  paymentService,
  BoostOrderRequest,
  BoostOrderResponse,
  PaymentStatus,
} from "../lib/payment";
import { useToast } from "../components/Toast";

// ===== TYPES =====

export interface PaymentState {
  isLoading: boolean;
  isProcessing: boolean;
  currentOrder: BoostOrderResponse | null;
  paymentStatus: PaymentStatus["status"] | null;
  error: string | null;
  retryCount: number;
  lastAttempt: number | null;
}

export interface PaymentContextType {
  state: PaymentState;
  createBoostOrder: (request: BoostOrderRequest) => Promise<BoostOrderResponse>;
  verifyPayment: (orderId: string) => Promise<void>;
  pollPaymentStatus: (orderId: string) => Promise<PaymentStatus["status"]>;
  redirectToPayment: (paymentLink: string, paymentSessionId?: string) => void;
  clearError: () => void;
  resetState: () => void;
  retryPayment: (request: BoostOrderRequest) => Promise<BoostOrderResponse>;
}

// ===== ACTION TYPES =====

type PaymentAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_PROCESSING"; payload: boolean }
  | { type: "SET_ORDER"; payload: BoostOrderResponse }
  | { type: "SET_STATUS"; payload: PaymentStatus["status"] }
  | { type: "SET_ERROR"; payload: string }
  | { type: "CLEAR_ERROR" }
  | { type: "RESET_STATE" }
  | { type: "INCREMENT_RETRY" };

// ===== REDUCER =====

const initialState: PaymentState = {
  isLoading: false,
  isProcessing: false,
  currentOrder: null,
  paymentStatus: null,
  error: null,
  retryCount: 0,
  lastAttempt: null,
};

function paymentReducer(
  state: PaymentState,
  action: PaymentAction,
): PaymentState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_PROCESSING":
      return { ...state, isProcessing: action.payload };
    case "SET_ORDER":
      return { ...state, currentOrder: action.payload, error: null };
    case "SET_STATUS":
      return { ...state, paymentStatus: action.payload };
    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        isLoading: false,
        isProcessing: false,
      };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    case "RESET_STATE":
      return initialState;
    case "INCREMENT_RETRY":
      return {
        ...state,
        retryCount: state.retryCount + 1,
        lastAttempt: Date.now(),
      };
    default:
      return state;
  }
}

// ===== CONTEXT =====

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

// ===== PROVIDER =====

export const PaymentProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(paymentReducer, initialState);
  const { showToast } = useToast();

  // ===== ACTIONS =====

  const createBoostOrder = useCallback(
    async (request: BoostOrderRequest): Promise<BoostOrderResponse> => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "CLEAR_ERROR" });

      try {
        const response = await paymentService.createBoostOrder(request);

        if (response.success) {
          dispatch({ type: "SET_ORDER", payload: response });
          showToast("Payment order created successfully", "success");
        } else {
          dispatch({
            type: "SET_ERROR",
            payload: response.error || "Failed to create payment order",
          });
          showToast(
            response.error || "Failed to create payment order",
            "error",
          );
        }

        return response;
      } catch (error) {
        const errorMessage = paymentService.getErrorMessage(error);
        dispatch({ type: "SET_ERROR", payload: errorMessage });
        showToast(errorMessage, "error");
        return { success: false, error: errorMessage };
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [showToast],
  );

  const verifyPayment = useCallback(
    async (orderId: string): Promise<void> => {
      dispatch({ type: "SET_PROCESSING", payload: true });
      dispatch({ type: "CLEAR_ERROR" });

      try {
        const verification = await paymentService.verifyPayment(orderId);

        if (verification.success) {
          dispatch({ type: "SET_STATUS", payload: verification.status });

          if (verification.status === "paid") {
            showToast(
              "Payment successful! Your listing has been boosted.",
              "success",
            );
          } else if (verification.status === "failed") {
            showToast("Payment failed. Please try again.", "error");
          }
        } else {
          dispatch({
            type: "SET_ERROR",
            payload: verification.error || "Payment verification failed",
          });
          showToast(
            verification.error || "Payment verification failed",
            "error",
          );
        }
      } catch (error) {
        const errorMessage = paymentService.getErrorMessage(error);
        dispatch({ type: "SET_ERROR", payload: errorMessage });
        showToast(errorMessage, "error");
      } finally {
        dispatch({ type: "SET_PROCESSING", payload: false });
      }
    },
    [showToast],
  );

  const pollPaymentStatus = useCallback(
    async (
      orderId: string,
      onStatusChange?: (status: PaymentStatus["status"]) => void,
    ): Promise<PaymentStatus["status"]> => {
      dispatch({ type: "SET_PROCESSING", payload: true });

      try {
        const finalStatus = await paymentService.pollPaymentStatus(
          orderId,
          (status) => {
            dispatch({ type: "SET_STATUS", payload: status });
            onStatusChange?.(status);
          },
        );

        if (finalStatus === "paid") {
          showToast(
            "Payment successful! Your listing has been boosted.",
            "success",
          );
        } else if (finalStatus === "failed") {
          showToast("Payment failed. Please try again.", "error");
        }

        return finalStatus;
      } catch (error) {
        const errorMessage = paymentService.getErrorMessage(error);
        dispatch({ type: "SET_ERROR", payload: errorMessage });
        showToast(errorMessage, "error");
        throw error;
      } finally {
        dispatch({ type: "SET_PROCESSING", payload: false });
      }
    },
    [showToast],
  );

  const redirectToPayment = useCallback(
    (paymentLink: string, paymentSessionId?: string): void => {
      try {
        paymentService.redirectToPayment(paymentLink, paymentSessionId);
      } catch (error) {
        const errorMessage = paymentService.getErrorMessage(error);
        dispatch({ type: "SET_ERROR", payload: errorMessage });
        showToast(errorMessage, "error");
      }
    },
    [showToast],
  );

  const retryPayment = useCallback(
    async (request: BoostOrderRequest): Promise<BoostOrderResponse> => {
      dispatch({ type: "INCREMENT_RETRY" });

      if (state.retryCount >= 3) {
        const errorMessage =
          "Maximum retry attempts reached. Please contact support.";
        dispatch({ type: "SET_ERROR", payload: errorMessage });
        showToast(errorMessage, "error");
        return { success: false, error: errorMessage };
      }

      showToast(
        `Retrying payment... (Attempt ${state.retryCount + 1}/3)`,
        "info",
      );
      return createBoostOrder(request);
    },
    [state.retryCount, createBoostOrder, showToast],
  );

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  const resetState = useCallback(() => {
    dispatch({ type: "RESET_STATE" });
  }, []);

  // ===== AUTO-CLEANUP =====

  // Reset state on component unmount if payment is complete
  useEffect(() => {
    if (state.paymentStatus === "paid" || state.paymentStatus === "failed") {
      const timer = setTimeout(() => {
        resetState();
      }, 30000); // Reset after 30 seconds

      return () => clearTimeout(timer);
    }
  }, [state.paymentStatus, resetState]);

  // ===== CONTEXT VALUE =====

  const value: PaymentContextType = {
    state,
    createBoostOrder,
    verifyPayment,
    pollPaymentStatus,
    redirectToPayment,
    clearError,
    resetState,
    retryPayment,
  };

  return (
    <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>
  );
};

// ===== HOOK =====

export const usePayment = (): PaymentContextType => {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error("usePayment must be used within a PaymentProvider");
  }
  return context;
};

// ===== UTILITY HOOKS =====

/**
 * Hook for handling boost payment flow
 */
export const useBoostPayment = () => {
  const { state, createBoostOrder, redirectToPayment, pollPaymentStatus } =
    usePayment();
  const { showToast } = useToast();

  const initiateBoostPayment = useCallback(
    async (listingId: string, tier: string, listingTitle?: string) => {
      try {
        // Create payment order
        const orderResponse = await createBoostOrder({
          listingId,
          tier,
          returnUrl: `${window.location.origin}/boost-success`,
          notifyUrl: `${window.location.origin}/api/payment-webhook`,
        });

        if (orderResponse.success && orderResponse.paymentLink) {
          // Show success message
          showToast(
            `Redirecting to payment for ${listingTitle || "listing"}...`,
            "info",
          );

          // Redirect to payment gateway
          setTimeout(() => {
            redirectToPayment(
              orderResponse.paymentLink!,
              orderResponse.paymentSessionId,
            );
          }, 1000);
        }

        return orderResponse;
      } catch (error) {
        console.error("Boost payment initiation failed:", error);
        return { success: false, error: "Payment initiation failed" };
      }
    },
    [createBoostOrder, redirectToPayment, showToast],
  );

  return {
    isLoading: state.isLoading,
    isProcessing: state.isProcessing,
    error: state.error,
    currentOrder: state.currentOrder,
    initiateBoostPayment,
  };
};

/**
 * Hook for payment status monitoring
 */
export const usePaymentStatus = (orderId?: string) => {
  const { state, verifyPayment, pollPaymentStatus } = usePayment();

  useEffect(() => {
    if (orderId) {
      // Initial verification
      verifyPayment(orderId);

      // Start polling if status is pending
      if (
        state.paymentStatus === "pending" ||
        state.paymentStatus === "processing"
      ) {
        pollPaymentStatus(orderId).catch(console.error);
      }
    }
  }, [orderId, verifyPayment, pollPaymentStatus, state.paymentStatus]);

  return {
    status: state.paymentStatus,
    isProcessing: state.isProcessing,
    error: state.error,
  };
};

export default PaymentContext;
