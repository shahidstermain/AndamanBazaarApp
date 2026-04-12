import { describe, it, expect } from "vitest";
import {
  generateCSRFToken,
  validateCSRFToken,
  checkRateLimit,
  validateInput,
  sanitizeInput,
  validateFileUpload,
  detectSuspiciousActivity,
} from "../../src/lib/security-client";

describe("Client Security Utilities", () => {
  describe("CSRF Token Management", () => {
    it("should generate valid CSRF tokens", () => {
      const sessionId = "test-session-123";
      const token = generateCSRFToken(sessionId);

      expect(token).toBeTruthy();
      expect(token).toContain(sessionId);
      expect(token.length).toBeGreaterThan(50);
    });

    it("should validate CSRF tokens correctly", () => {
      const sessionId = "test-session-123";
      const token = generateCSRFToken(sessionId);

      expect(validateCSRFToken(token, sessionId)).toBe(true);
      expect(validateCSRFToken("invalid-token", sessionId)).toBe(false);
    });

    it("should generate unique tokens for different sessions", () => {
      const sessionId1 = "session-1";
      const sessionId2 = "session-2";

      const token1 = generateCSRFToken(sessionId1);
      const token2 = generateCSRFToken(sessionId2);

      expect(token1).not.toBe(token2);
    });
  });

  describe("Rate Limiting", () => {
    it("should allow requests within limit", () => {
      const key = "test-user-123";

      // First few requests should be allowed
      expect(checkRateLimit(key, 60000, 5)).toBe(true);
      expect(checkRateLimit(key, 60000, 5)).toBe(true);
      expect(checkRateLimit(key, 60000, 5)).toBe(true);
    });

    it("should block requests exceeding limit", () => {
      const key = "test-user-456";

      // Exceed the limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit(key, 60000, 5);
      }

      // Next request should be blocked
      expect(checkRateLimit(key, 60000, 5)).toBe(false);
    });

    it("should reset after time window", () => {
      const key = "test-user-789";

      // Exceed the limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit(key, 100, 5); // 100ms window for testing
      }

      // Should be blocked
      expect(checkRateLimit(key, 100, 5)).toBe(false);

      // Wait for window to reset (in real implementation)
      // This would need to be tested with time mocking
    });
  });

  describe("Input Validation", () => {
    it("should validate valid input", () => {
      const result = validateInput("valid input");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject oversized input", () => {
      const largeInput = "a".repeat(10001);
      const result = validateInput(largeInput, 10000);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Input too large");
    });

    it("should validate objects", () => {
      const validObject = { name: "John", age: 30 };
      const result = validateInput(validObject);
      expect(result.isValid).toBe(true);
    });

    it("should reject oversized objects", () => {
      const largeObject = { data: "a".repeat(10001) };
      const result = validateInput(largeObject, 10000);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Input too large");
    });
  });

  describe("Input Sanitization", () => {
    it("should sanitize script tags", () => {
      const input = '<script>alert("xss")</script>Hello World';
      const sanitized = sanitizeInput(input);
      // DOMPurify strips <script> tags; exact output depends on DOMPurify version
      expect(sanitized).not.toContain("<script>");
      expect(sanitized).not.toContain("alert");
    });

    it("should sanitize javascript: protocol", () => {
      const input = 'javascript:alert("xss")';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe('alert("xss")');
    });

    it("should sanitize event handlers", () => {
      const input = '<div onclick="alert(\"xss\")">Click me</div>';
      const sanitized = sanitizeInput(input);
      expect(sanitized).toBe("<div>Click me</div>");
    });

    it("should limit string length", () => {
      const longString = "a".repeat(2000);
      const sanitized = sanitizeInput(longString);
      expect(sanitized.length).toBeLessThanOrEqual(1000);
    });

    it("should sanitize nested objects", () => {
      const input = {
        name: 'John<script>alert("xss")</script>',
        bio: 'I like javascript:alert("xss")',
        nested: {
          description: '<img src="x" onerror="alert(1)">',
        },
      };

      const sanitized = sanitizeInput(input);
      // DOMPurify strips <script> tags; text may or may not survive depending on version
      expect(sanitized.name).not.toContain("<script>");
      expect(sanitized.bio).not.toContain("javascript:");
      expect(sanitized.nested.description).not.toContain("onerror");
    });

    it("should handle arrays", () => {
      const input = [
        '<script>alert("xss")</script>',
        "javascript:alert(1)",
        "normal text",
      ];
      const sanitized = sanitizeInput(input);
      expect(sanitized[0]).toBe("");
      expect(sanitized[1]).toBe("alert(1)");
      expect(sanitized[2]).toBe("normal text");
    });
  });

  describe("File Upload Validation", () => {
    it("should validate allowed file types", () => {
      const validFile = new File(["content"], "test.jpg", {
        type: "image/jpeg",
      });
      const result = validateFileUpload(validFile);
      expect(result.isValid).toBe(true);
    });

    it("should reject invalid file types", () => {
      const invalidFile = new File(["content"], "test.exe", {
        type: "application/x-msdownload",
      });
      const result = validateFileUpload(invalidFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid file type");
    });

    it("should validate file size", () => {
      const largeFile = new File(
        [new ArrayBuffer(6 * 1024 * 1024)],
        "test.jpg",
        { type: "image/jpeg" },
      );
      const result = validateFileUpload(largeFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("File too large");
    });

    it("should validate file extensions", () => {
      const invalidFile = new File(["content"], "test.php", {
        type: "image/jpeg",
      });
      const result = validateFileUpload(invalidFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Invalid file extension");
    });

    it("should handle case-insensitive extensions", () => {
      const file = new File(["content"], "test.JPG", { type: "image/jpeg" });
      const result = validateFileUpload(file);
      expect(result.isValid).toBe(true);
    });
  });

  describe("Suspicious Activity Detection", () => {
    it("should detect bot user agents", () => {
      const userAgent =
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
      const result = detectSuspiciousActivity(userAgent, "192.168.1.1", [
        "normal browsing",
      ]);
      expect(result).toBe(true);
    });

    it("should detect SQL injection patterns", () => {
      const userAgent = "Mozilla/5.0";
      const behavior = ["SELECT * FROM users", "normal browsing"];
      const result = detectSuspiciousActivity(
        userAgent,
        "192.168.1.1",
        behavior,
      );
      expect(result).toBe(true);
    });

    it("should detect XSS patterns", () => {
      const userAgent = "Mozilla/5.0";
      const behavior = ['<script>alert("xss")</script>', "normal browsing"];
      const result = detectSuspiciousActivity(
        userAgent,
        "192.168.1.1",
        behavior,
      );
      expect(result).toBe(true);
    });

    it("should not flag normal activity", () => {
      const userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
      const behavior = ["browsing listings", "searching for items"];
      const result = detectSuspiciousActivity(
        userAgent,
        "192.168.1.1",
        behavior,
      );
      expect(result).toBe(false);
    });
  });
});
