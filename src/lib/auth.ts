import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { logAuditEvent, sanitizeErrorMessage } from './security';

// ===== AUTHENTICATION UTILITIES =====

/**
 * Result type for authentication operations
 */
export interface AuthResult {
    success: boolean;
    error?: string;
}

/**
 * Securely log out the current user
 * Clears the Firebase session and logs the action for audit trail
 */
export const logout = async (): Promise<AuthResult> => {
    try {
        // Log the logout action before signing out
        await logAuditEvent({
            action: 'user_logout',
            status: 'success',
            metadata: { timestamp: new Date().toISOString() }
        });

        await signOut(auth);

        return { success: true };
    } catch (err: any) {
        const safeError = sanitizeErrorMessage(err);

        await logAuditEvent({
            action: 'user_logout',
            status: 'failed',
            metadata: { error: safeError }
        });

        return {
            success: false,
            error: safeError || 'Failed to logout. Please try again.'
        };
    }
};

/**
 * Check if a user is currently authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
    return !!auth.currentUser;
};

/**
 * Get the current user's ID
 */
export const getCurrentUserId = async (): Promise<string | null> => {
    return auth.currentUser?.uid || null;
};
