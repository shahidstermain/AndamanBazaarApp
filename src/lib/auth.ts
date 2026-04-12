import {
  auth as firebaseAuth,
  signIn as firebaseSignIn,
  signUp as firebaseSignUp,
  signOutUser as firebaseSignOut,
  onAuthStateChange,
  signInWithGoogle as firebaseSignInWithGoogle,
} from "./firebase";
import { logAuditEvent, sanitizeErrorMessage } from "./security";

// ===== AUTHENTICATION UTILITIES =====

/**
 * Authentication provider types
 */
export type AuthProvider = "firebase";

/**
 * Result type for authentication operations
 */
export interface AuthResult {
  success: boolean;
  error?: string;
}

/**
 * User profile interface
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: string;
  isActive: boolean;
  isBanned: boolean;
  locationVerified: boolean;
  stats: {
    listingCount: number;
    soldCount: number;
    favoriteCount: number;
    chatCount: number;
  };
}

/**
 * Get current authentication provider based on environment
 */
export const getAuthProvider = (): AuthProvider => "firebase";

/**
 * Check if Firebase is configured
 */
export const isFirebaseAvailable = (): boolean => {
  try {
    return (
      !!import.meta.env.VITE_FIREBASE_API_KEY &&
      !!import.meta.env.VITE_FIREBASE_PROJECT_ID
    );
  } catch {
    return false;
  }
};

/**
 * Get current user from the appropriate provider
 */
export const getCurrentUser = async (): Promise<UserProfile | null> => {
  try {
    const user = firebaseAuth.currentUser;
    if (user) {
      const { getUserProfile } = await import("./firebase");
      const profile = await getUserProfile(user.uid);
      return profile as UserProfile | null;
    }
  } catch (error) {
    console.error("Error getting current user:", error);
  }
  return null;
};

/**
 * Check if a user is currently authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  return !!firebaseAuth.currentUser;
};

/**
 * Get the current user's ID
 */
export const getCurrentUserId = async (): Promise<string | null> => {
  return firebaseAuth.currentUser?.uid || null;
};

/**
 * Sign in with email and password
 */
export const signIn = async (
  email: string,
  password: string,
): Promise<AuthResult> => {
  try {
    await firebaseSignIn(email, password);
    await logAuditEvent({
      action: "user_login",
      status: "success",
      metadata: { provider: "firebase", email },
    });
    return { success: true };
  } catch (err: any) {
    const safeError = sanitizeErrorMessage(err);
    await logAuditEvent({
      action: "user_login",
      status: "failed",
      metadata: { email, error: safeError },
    });
    return {
      success: false,
      error: safeError || "Failed to sign in. Please check your credentials.",
    };
  }
};

/**
 * Sign up with email and password
 */
export const signUp = async (
  email: string,
  password: string,
  name?: string,
): Promise<AuthResult> => {
  try {
    await firebaseSignUp(email, password, name);
    await logAuditEvent({
      action: "user_signup",
      status: "success",
      metadata: { provider: "firebase", email },
    });
    return { success: true };
  } catch (err: any) {
    const safeError = sanitizeErrorMessage(err);
    await logAuditEvent({
      action: "user_signup",
      status: "failed",
      metadata: { email, error: safeError },
    });
    return {
      success: false,
      error: safeError || "Failed to sign up. Please try again.",
    };
  }
};

/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async (): Promise<AuthResult> => {
  try {
    await firebaseSignInWithGoogle();
    await logAuditEvent({
      action: "user_login",
      status: "success",
      metadata: { provider: "google" },
    });
    return { success: true };
  } catch (err: any) {
    const safeError = sanitizeErrorMessage(err);
    await logAuditEvent({
      action: "user_login",
      status: "failed",
      metadata: { provider: "google", error: safeError },
    });
    // Handle popup closed by user gracefully
    if (
      err?.code === "auth/popup-closed-by-user" ||
      err?.code === "auth/cancelled-popup-request"
    ) {
      return { success: false, error: "Sign-in was cancelled." };
    }
    return {
      success: false,
      error: safeError || "Google sign-in failed. Please try again.",
    };
  }
};

/**
 * Securely log out the current user
 */
export const logout = async (): Promise<AuthResult> => {
  try {
    await logAuditEvent({
      action: "user_logout",
      status: "success",
      metadata: { timestamp: new Date().toISOString() },
    });
    await firebaseSignOut();
    return { success: true };
  } catch (err: any) {
    const safeError = sanitizeErrorMessage(err);
    await logAuditEvent({
      action: "user_logout",
      status: "failed",
      metadata: { error: safeError },
    });
    return {
      success: false,
      error: safeError || "Failed to logout. Please try again.",
    };
  }
};

/**
 * Subscribe to auth state changes
 */
export const onAuthStateChanged = (
  callback: (user: UserProfile | null) => void,
) => {
  return onAuthStateChange(async (firebaseUser) => {
    if (firebaseUser) {
      const { getUserProfile } = await import("./firebase");
      const profile = await getUserProfile(firebaseUser.uid);
      callback(profile as UserProfile | null);
    } else {
      callback(null);
    }
  });
};
