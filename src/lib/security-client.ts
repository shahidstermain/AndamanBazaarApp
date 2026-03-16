import DOMPurify from 'dompurify';

// CSRF Token Management for React/Firebase applications
export const csrfTokens = new Map<string, string>()

export const generateCSRFToken = (sessionId: string): string => {
  const timestamp = Date.now().toString()
  const randomBytes = Array.from({length: 16}, () => Math.floor(Math.random() * 256).toString(16)).join('')
  const token = `${sessionId}-${timestamp}-${randomBytes}`
  csrfTokens.set(sessionId, token)
  return token
}

export const validateCSRFToken = (token: string, sessionId: string): boolean => {
  const storedToken = csrfTokens.get(sessionId)
  return storedToken === token
}

// Client-side CSRF protection for React
export const addCSRFProtection = async (url: string, options: RequestInit = {}): Promise<RequestInit> => {
  // Get session ID from localStorage or generate one
  let sessionId = localStorage.getItem('csrf_session_id')
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15)
    localStorage.setItem('csrf_session_id', sessionId)
  }

  // Generate CSRF token
  const csrfToken = generateCSRFToken(sessionId)
  
  // Add CSRF token to headers
  const headers = {
    ...options.headers,
    'X-CSRF-Token': csrfToken,
    'X-Session-ID': sessionId
  }

  return {
    ...options,
    headers
  }
}

// Rate limiting for client-side requests
export const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export const checkRateLimit = (key: string, windowMs: number = 60000, max: number = 100): boolean => {
  const now = Date.now()
  const resetTime = now + windowMs

  let record = rateLimitStore.get(key)
  
  if (!record || record.resetTime < now) {
    record = { count: 1, resetTime }
    rateLimitStore.set(key, record)
    return true
  } else {
    record.count++
    return record.count <= max
  }
}

// Input validation for client-side forms
export const validateInput = (input: any, maxSize: number = 10000): { isValid: boolean; error?: string } => {
  try {
    // Check input size
    if (typeof input === 'string' && input.length > maxSize) {
      return { isValid: false, error: 'Input too large' }
    }
    
    if (typeof input === 'object' && JSON.stringify(input).length > maxSize) {
      return { isValid: false, error: 'Input too large' }
    }

    // Sanitize input
    const sanitized = sanitizeInput(input)
    
    return { isValid: true }
  } catch (error) {
    return { isValid: false, error: 'Invalid input' }
  }
}

// Input sanitization
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
      let sanitized = DOMPurify.sanitize(input);
      sanitized = sanitized.replace(/javascript:/gi, '');
      return sanitized.substring(0, 1000);
    }
  
  if (typeof input === 'object' && input !== null) {
    if (Array.isArray(input)) {
      return input.map(sanitizeInput)
    }
    
    const sanitized: any = {}
    for (const key in input) {
      if (input.hasOwnProperty(key)) {
        sanitized[key] = sanitizeInput(input[key])
      }
    }
    return sanitized
  }
  
  return input
}

// Security headers for client-side requests
export const addSecurityHeaders = (options: RequestInit = {}): RequestInit => {
  return {
    ...options,
    headers: {
      ...options.headers,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  }
}

// File upload validation for client-side
export const validateFileUpload = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const maxSize = 5 * 1024 * 1024 // 5MB

  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type' }
  }

  if (file.size > maxSize) {
    return { isValid: false, error: 'File too large' }
  }

  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
  
  if (!allowedExtensions.includes(fileExtension)) {
    return { isValid: false, error: 'Invalid file extension' }
  }

  return { isValid: true }
}

// Error handling for client-side
export const handleSecurityError = (error: any): string => {
  console.error('Security error:', {
    error: error.message,
    timestamp: new Date().toISOString()
  })

  // Don't expose sensitive information
  if (error.status === 403) {
    return 'Security validation failed. Please try again.'
  } else if (error.status === 429) {
    return 'Too many requests. Please wait a moment.'
  } else if (error.status === 413) {
    return 'Request too large. Please reduce the size.'
  }
  
  return 'Something went wrong. Please try again.'
}

// Rate limiting with exponential backoff
export const rateLimitWithBackoff = (key: string, attempt: number): number => {
  const baseDelay = 1000 // 1 second
  const maxDelay = 30000 // 30 seconds
  const backoffFactor = 2
  
  const delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay)
  return delay
}

// Detect suspicious activity patterns
export const detectSuspiciousActivity = (userAgent: string, ip: string, behavior: string[]): boolean => {
  const suspiciousPatterns = [
    /bot|crawler|spider|scraper/i,
    /sqlmap|nikto|burp|zap/i,
    /<script|javascript:/i,
    /union.*select|drop.*table|insert.*into|select\s+\*\s+from/i
  ]

  const combinedString = `${userAgent} ${ip} ${behavior.join(' ')}`
  
  return suspiciousPatterns.some(pattern => pattern.test(combinedString))
}

// Session security helpers
export const generateSecureSessionId = (): string => {
  return Array.from({length: 32}, () => Math.random().toString(36).charAt(2)).join('')
}

export const validateSessionTimeout = (lastActivity: number, timeoutMs: number = 1800000): boolean => {
  return Date.now() - lastActivity < timeoutMs
}
