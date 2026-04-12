// CSRF Token Management
export const csrfTokens = new Map<string, string>();

export const generateCSRFToken = (sessionId: string): string => {
  const timestamp = Date.now().toString();
  const randomBytes = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256).toString(16),
  ).join("");
  return `${sessionId}-${timestamp}-${randomBytes}`;
};

export const validateCSRFToken = (
  token: string,
  sessionId: string,
): boolean => {
  const storedToken = csrfTokens.get(sessionId);
  return storedToken === token;
};

export const csrfMiddleware = (req: any, res: any, next: any) => {
  // Skip CSRF for GET requests and static assets
  if (
    req.method === "GET" ||
    req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)
  ) {
    return next();
  }

  const token = req.headers["x-csrf-token"] || req.body._csrf;
  const sessionId = req.session?.id || req.ip;

  if (!token || !sessionId) {
    return res.status(403).json({ error: "CSRF token missing" });
  }

  if (!validateCSRFToken(token, sessionId)) {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }

  next();
};

// Rate Limiting
export const rateLimitStore = new Map<
  string,
  { count: number; resetTime: number }
>();

export const rateLimitMiddleware = (
  windowMs: number = 60000,
  max: number = 100,
) => {
  return (req: any, res: any, next: any) => {
    const key = req.ip || req.connection.remoteAddress || "unknown";
    const now = Date.now();
    const resetTime = now + windowMs;

    let record = rateLimitStore.get(key);

    if (!record || record.resetTime < now) {
      record = { count: 1, resetTime };
      rateLimitStore.set(key, record);
    } else {
      record.count++;
    }

    if (record.count > max) {
      return res.status(429).json({
        error: "Too many requests",
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    res.setHeader("X-RateLimit-Limit", max.toString());
    res.setHeader("X-RateLimit-Remaining", (max - record.count).toString());
    res.setHeader(
      "X-RateLimit-Reset",
      new Date(record.resetTime).toISOString(),
    );

    next();
  };
};

// Strict Input Validation
export const validateInput = (maxSize: number = 10000) => {
  return (req: any, res: any, next: any) => {
    try {
      // Validate request body size
      if (req.body && JSON.stringify(req.body).length > maxSize) {
        return res.status(413).json({ error: "Request body too large" });
      }

      // Sanitize input
      if (req.body) {
        req.body = sanitizeObject(req.body);
      }
      if (req.query) {
        req.query = sanitizeObject(req.query);
      }
      if (req.params) {
        req.params = sanitizeObject(req.params);
      }

      next();
    } catch (error) {
      res.status(400).json({ error: "Invalid input" });
    }
  };
};

// Input Sanitization
export const sanitizeObject = (obj: any): any => {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (typeof value === "string") {
        // Sanitize strings
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/javascript:/gi, "")
          .replace(/on\w+\s*=/gi, "")
          .trim()
          .substring(0, 1000); // Limit string length
      } else if (typeof value === "object") {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
};

// Security Headers
export const securityHeaders = (req: any, res: any, next: any) => {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
  );

  next();
};

// File Upload Security
export const validateFileUpload = (req: any, res: any, next: any) => {
  if (!req.file) {
    return next();
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: "Invalid file type" });
  }

  if (req.file.size > maxSize) {
    return res.status(400).json({ error: "File too large" });
  }

  // Check file extension
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  const fileExtension = req.file.originalname
    .toLowerCase()
    .substring(req.file.originalname.lastIndexOf("."));

  if (!allowedExtensions.includes(fileExtension)) {
    return res.status(400).json({ error: "Invalid file extension" });
  }

  next();
};

// Error Handling
export const errorHandler = (err: any, req: any, res: any, next: any) => {
  // Log error for monitoring
  console.error("Security error:", {
    error: err.message,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  // Don't expose sensitive information
  const isDevelopment =
    typeof window !== "undefined"
      ? false
      : typeof process !== "undefined" &&
        process.env.NODE_ENV === "development";

  res.status(err.status || 500).json({
    error: "Internal server error",
    message: isDevelopment ? err.message : "Something went wrong",
    ...(isDevelopment && { stack: err.stack }),
  });
};
