import { useState, useEffect } from "react";
import {
  generateCSRFToken,
  validateInput,
  checkRateLimit,
  sanitizeInput,
} from "../lib/security-client";

export const useSecurity = () => {
  const [csrfToken, setCsrfToken] = useState<string>("");
  const [rateLimitInfo, setRateLimitInfo] = useState({
    remaining: 100,
    resetTime: Date.now() + 60000,
  });

  useEffect(() => {
    // Generate CSRF token on mount
    const sessionId =
      localStorage.getItem("csrf_session_id") || generateSecureSessionId();
    if (!localStorage.getItem("csrf_session_id")) {
      localStorage.setItem("csrf_session_id", sessionId);
    }

    const token = generateCSRFToken(sessionId);
    setCsrfToken(token);
  }, []);

  const generateSecureSessionId = (): string => {
    return Array.from({ length: 32 }, () =>
      Math.random().toString(36).charAt(2),
    ).join("");
  };

  const validateFormInput = (
    input: any,
  ): { isValid: boolean; error?: string } => {
    return validateInput(input);
  };

  const checkRateLimitStatus = (key: string): boolean => {
    return checkRateLimit(key);
  };

  const sanitizeFormInput = (input: any): any => {
    return sanitizeInput(input);
  };

  const addSecurityHeaders = async (
    url: string,
    options: RequestInit = {},
  ): Promise<RequestInit> => {
    const sessionId =
      localStorage.getItem("csrf_session_id") || generateSecureSessionId();
    const token = generateCSRFToken(sessionId);

    return {
      ...options,
      headers: {
        ...options.headers,
        "X-CSRF-Token": token,
        "X-Session-ID": sessionId,
        "X-RateLimit-Key": `${sessionId}-${url}`,
      },
    };
  };

  const handleSecurityError = (error: any): string => {
    if (error.status === 403) {
      return "Security validation failed. Please refresh the page and try again.";
    } else if (error.status === 429) {
      return "Too many requests. Please wait a moment before trying again.";
    } else if (error.status === 413) {
      return "Request too large. Please reduce the input size.";
    }

    return "Something went wrong. Please try again.";
  };

  return {
    csrfToken,
    rateLimitInfo,
    validateFormInput,
    checkRateLimitStatus,
    sanitizeFormInput,
    addSecurityHeaders,
    handleSecurityError,
  };
};

// Hook for file upload validation
export const useFileUploadSecurity = () => {
  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: "Invalid file type. Only images are allowed.",
      };
    }

    if (file.size > maxSize) {
      return { isValid: false, error: "File too large. Maximum size is 5MB." };
    }

    // Check file extension
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const fileExtension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."));

    if (!allowedExtensions.includes(fileExtension)) {
      return { isValid: false, error: "Invalid file extension." };
    }

    return { isValid: true };
  };

  return { validateFile };
};

// Hook for form validation with security
export const useSecureForm = (initialValues: Record<string, any>) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { validateFormInput, sanitizeFormInput } = useSecurity();

  const validateField = (name: string, value: any): string | undefined => {
    const result = validateFormInput(value);
    if (!result.isValid) {
      return result.error;
    }
    return undefined;
  };

  const handleChange = (name: string, value: any) => {
    // Sanitize input
    const sanitizedValue = sanitizeFormInput(value);

    // Validate field
    const error = validateField(name, sanitizedValue);

    setValues((prev) => ({ ...prev, [name]: sanitizedValue }));
    setErrors((prev) => ({ ...prev, [name]: error || "" }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    Object.keys(values).forEach((key) => {
      const error = validateField(key, values[key]);
      if (error) {
        newErrors[key] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return {
    values,
    errors,
    handleChange,
    validateForm,
    setValues,
  };
};
