/**
 * Payment Security Testing Suite
 * Specialized security tests for payment processing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import crypto from 'crypto'

describe('Payment Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Payment Data Encryption', () => {
    it('should encrypt sensitive payment data', () => {
      const paymentData = {
        cardNumber: '4111111111111111',
        cvv: '123',
        expiryMonth: '12',
        expiryYear: '2025'
      }
      
      // Mock encryption function
      const encryptPaymentData = (data: any) => {
        const algorithm = 'aes-256-gcm'
        const key = crypto.randomBytes(32)
        const iv = crypto.randomBytes(16)
        const cipher = crypto.createCipheriv(algorithm, key, iv)
        
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
        encrypted += cipher.final('hex')
        
        const authTag = cipher.getAuthTag()
        
        return {
          encrypted,
          iv: iv.toString('hex'),
          authTag: authTag.toString('hex')
        }
      }
      
      const encrypted = encryptPaymentData(paymentData)
      
      expect(encrypted.encrypted).toBeDefined()
      expect(encrypted.iv).toBeDefined()
      expect(encrypted.authTag).toBeDefined()
      expect(encrypted.encrypted).not.toContain('4111111111111111')
      expect(encrypted.encrypted).not.toContain('123')
    })

    it('should validate payment card numbers using Luhn algorithm', () => {
      const validateCardNumber = (cardNumber: string) => {
        const cleaned = cardNumber.replace(/\s/g, '')
        let sum = 0
        let isEven = false
        
        for (let i = cleaned.length - 1; i >= 0; i--) {
          let digit = parseInt(cleaned[i])
          
          if (isEven) {
            digit *= 2
            if (digit > 9) {
              digit -= 9
            }
          }
          
          sum += digit
          isEven = !isEven
        }
        
        return sum % 10 === 0 && cleaned.length >= 13 && cleaned.length <= 19
      }
      
      // Valid card numbers (test cards)
      expect(validateCardNumber('4111111111111111')).toBe(true) // Visa
      expect(validateCardNumber('5555555555554444')).toBe(true) // Mastercard
      expect(validateCardNumber('378282246310005')).toBe(true) // Amex
      
      // Invalid card numbers
      expect(validateCardNumber('4111111111111112')).toBe(false)
      expect(validateCardNumber('1234567890123456')).toBe(false)
      expect(validateCardNumber('invalid')).toBe(false)
    })
  })

  describe('Payment Flow Security', () => {
    it('should validate payment signatures', () => {
      const paymentData = {
        orderId: 'order_123',
        amount: 10000,
        currency: 'INR',
        timestamp: Date.now()
      }
      
      const generateSignature = (data: any, secret: string) => {
        const payload = Object.keys(data)
          .sort()
          .map(key => `${key}=${data[key]}`)
          .join('&')
        
        return crypto.createHmac('sha256', secret).update(payload).digest('hex')
      }
      
      const secret = 'test_secret_key'
      const signature = generateSignature(paymentData, secret)
      
      // Verify signature
      const verifySignature = (data: any, signature: string, secret: string) => {
        const expectedSignature = generateSignature(data, secret)
        return crypto.timingSafeEqual(
          Buffer.from(signature, 'hex'),
          Buffer.from(expectedSignature, 'hex')
        )
      }
      
      expect(verifySignature(paymentData, signature, secret)).toBe(true)
      expect(verifySignature(paymentData, 'invalid_signature', secret)).toBe(false)
      expect(verifySignature({ ...paymentData, amount: 20000 }, signature, secret)).toBe(false)
    })

    it('should prevent payment amount manipulation', () => {
      const originalAmount = 10000
      const manipulatedAmount = 1000 // 90% reduction
      
      const validatePaymentAmount = (original: number, received: number) => {
        const maxVariance = 0.01 // 1% variance allowed
        const variance = Math.abs(original - received) / original
        return variance <= maxVariance
      }
      
      expect(validatePaymentAmount(originalAmount, originalAmount)).toBe(true)
      expect(validatePaymentAmount(originalAmount, manipulatedAmount)).toBe(false)
      expect(validatePaymentAmount(originalAmount, originalAmount + 50)).toBe(true) // Within 1%
      expect(validatePaymentAmount(originalAmount, originalAmount + 200)).toBe(false) // Over 1%
    })

    it('should implement proper payment status tracking', () => {
      const paymentStates = ['pending', 'processing', 'completed', 'failed', 'refunded']
      const validTransitions = {
        'pending': ['processing', 'failed'],
        'processing': ['completed', 'failed'],
        'completed': ['refunded'],
        'failed': ['pending'], // Retry
        'refunded': [] // Final state
      }
      
      const isValidTransition = (from: string, to: string) => {
        return validTransitions[from]?.includes(to) || false
      }
      
      expect(isValidTransition('pending', 'processing')).toBe(true)
      expect(isValidTransition('processing', 'completed')).toBe(true)
      expect(isValidTransition('completed', 'refunded')).toBe(true)
      expect(isValidTransition('pending', 'completed')).toBe(false) // Can't skip processing
      expect(isValidTransition('refunded', 'processing')).toBe(false) // Can't undo refund
    })
  })

  describe('Webhook Security', () => {
    it('should validate webhook signatures', () => {
      const webhookPayload = {
        order_id: 'order_123',
        payment_id: 'pay_123',
        status: 'completed',
        amount: 10000
      }
      
      const webhookSecret = 'webhook_secret_key'
      
      const generateWebhookSignature = (payload: any, secret: string) => {
        const payloadString = JSON.stringify(payload)
        return crypto.createHmac('sha256', secret).update(payloadString).digest('hex')
      }
      
      const signature = generateWebhookSignature(webhookPayload, webhookSecret)
      
      const verifyWebhookSignature = (payload: any, signature: string, secret: string) => {
        const expectedSignature = generateWebhookSignature(payload, secret)
        return crypto.timingSafeEqual(
          Buffer.from(signature, 'hex'),
          Buffer.from(expectedSignature, 'hex')
        )
      }
      
      expect(verifyWebhookSignature(webhookPayload, signature, webhookSecret)).toBe(true)
      expect(verifyWebhookSignature(webhookPayload, 'invalid_signature', webhookSecret)).toBe(false)
      
      // Test with modified payload
      const modifiedPayload = { ...webhookPayload, amount: 5000 }
      expect(verifyWebhookSignature(modifiedPayload, signature, webhookSecret)).toBe(false)
    })

    it('should prevent replay attacks', () => {
      const processedWebhooks = new Map<string, number>()
      
      const isReplayAttack = (webhookId: string, timestamp: number) => {
        const maxAge = 5 * 60 * 1000 // 5 minutes
        const now = Date.now()
        
        // Check if webhook is too old
        if (now - timestamp > maxAge) {
          return true
        }
        
        // Check if webhook was already processed
        if (processedWebhooks.has(webhookId)) {
          return true
        }
        
        // Mark as processed
        processedWebhooks.set(webhookId, timestamp)
        return false
      }
      
      const webhookId = 'webhook_123'
      const timestamp = Date.now()
      
      expect(isReplayAttack(webhookId, timestamp)).toBe(false)
      expect(isReplayAttack(webhookId, timestamp)).toBe(true) // Replay attempt
      
      // Old webhook
      const oldTimestamp = Date.now() - 10 * 60 * 1000 // 10 minutes ago
      expect(isReplayAttack('webhook_456', oldTimestamp)).toBe(true)
    })
  })

  describe('Rate Limiting', () => {
    it('should implement payment attempt rate limiting', () => {
      const paymentAttempts = new Map<string, { count: number; resetTime: number }>()
      
      const checkRateLimit = (userId: string, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
        const now = Date.now()
        const userAttempts = paymentAttempts.get(userId)
        
        if (!userAttempts || now > userAttempts.resetTime) {
          paymentAttempts.set(userId, { count: 1, resetTime: now + windowMs })
          return { allowed: true, remaining: maxAttempts - 1 }
        }
        
        if (userAttempts.count >= maxAttempts) {
          return { allowed: false, remaining: 0, resetTime: userAttempts.resetTime }
        }
        
        userAttempts.count++
        return { allowed: true, remaining: maxAttempts - userAttempts.count }
      }
      
      const userId = 'user_123'
      
      // First 5 attempts should be allowed
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(userId)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(4 - i)
      }
      
      // 6th attempt should be blocked
      const blocked = checkRateLimit(userId)
      expect(blocked.allowed).toBe(false)
      expect(blocked.remaining).toBe(0)
    })
  })

  describe('Data Privacy', () => {
    it('should mask sensitive payment data in logs', () => {
      const paymentData = {
        orderId: 'order_123',
        amount: 10000,
        cardNumber: '4111111111111111',
        cvv: '123',
        email: 'user@example.com'
      }
      
      const maskSensitiveData = (data: any) => {
        const sensitiveFields = ['cardNumber', 'cvv', 'password', 'token']
        const masked = { ...data }
        
        sensitiveFields.forEach(field => {
          if (masked[field]) {
            if (field === 'cvv') {
              masked[field] = '***'
            } else if (field === 'cardNumber') {
              masked[field] = masked[field].slice(-4).padStart(masked[field].length, '*')
            } else {
              masked[field] = '***'
            }
          }
        })
        
        return masked
      }
      
      const masked = maskSensitiveData(paymentData)
      
      expect(masked.cardNumber).toBe('************1111')
      expect(masked.cvv).toBe('***')
      expect(masked.orderId).toBe('order_123') // Non-sensitive fields unchanged
      expect(masked.email).toBe('user@example.com')
    })

    it('should implement proper data retention policies', () => {
      const paymentRecords = new Map<string, { createdAt: Date; status: string }>()
      
      const cleanupOldData = (retentionDays = 7) => {
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
        
        for (const [id, record] of paymentRecords.entries()) {
          if (record.createdAt < cutoffDate && record.status === 'completed') {
            paymentRecords.delete(id)
          }
        }
      }
      
      // Add test data
      const oldRecord = { createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), status: 'completed' }
      const recentRecord = { createdAt: new Date(), status: 'completed' }
      const pendingRecord = { createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), status: 'pending' }
      
      paymentRecords.set('old_payment', oldRecord)
      paymentRecords.set('recent_payment', recentRecord)
      paymentRecords.set('pending_payment', pendingRecord)
      
      cleanupOldData()
      
      expect(paymentRecords.has('old_payment')).toBe(false) // Should be deleted
      expect(paymentRecords.has('recent_payment')).toBe(true) // Should be kept
      expect(paymentRecords.has('pending_payment')).toBe(true) // Pending records kept regardless of age
    })
  })
})
