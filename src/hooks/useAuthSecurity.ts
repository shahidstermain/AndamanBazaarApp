// Security enhancements for AuthView component
import { useState, useEffect } from "react";
import { useSecurity } from "../hooks/useSecurity";

export const useAuthSecurity = () => {
  const {
    validateFormInput,
    sanitizeFormInput,
    checkRateLimitStatus,
    handleSecurityError,
  } = useSecurity();
  const [rateLimitKey, setRateLimitKey] = useState("");
  const [isRateLimited, setIsRateLimited] = useState(false);

  useEffect(() => {
    // Generate rate limit key based on IP/session
    const key = `auth-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    setRateLimitKey(key);
  }, []);

  const validateAuthInput = (email: string, password: string) => {
    const errors: Record<string, string> = {};

    // Validate email
    const emailResult = validateFormInput(email);
    if (!emailResult.isValid) {
      errors.email = emailResult.error || "Invalid email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    // Validate password
    const passwordResult = validateFormInput(password);
    if (!passwordResult.isValid) {
      errors.password = passwordResult.error || "Invalid password";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    return errors;
  };

  const sanitizeAuthInput = (input: string) => {
    return sanitizeFormInput(input);
  };

  const checkAuthRateLimit = (): boolean => {
    if (!rateLimitKey) return true;

    const isAllowed = checkRateLimitStatus(rateLimitKey);
    setIsRateLimited(!isAllowed);
    return isAllowed;
  };

  const handleAuthError = (error: any) => {
    if (error.status === 429) {
      return "Too many login attempts. Please try again later.";
    }
    return handleSecurityError(error);
  };

  return {
    validateAuthInput,
    sanitizeAuthInput,
    checkAuthRateLimit,
    handleAuthError,
    isRateLimited,
  };
};
