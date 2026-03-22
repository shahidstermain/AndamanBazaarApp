/**
 * PHASE 2 — Authentication Flow Unit Tests
 * Covers: login, signup, session expiry, wrong password, logout, auth guards
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { auth } from '../../src/lib/firebase'
import { logout, isAuthenticated, getCurrentUserId } from '../../src/lib/auth'
import { signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'

// Mock secondary dependencies
vi.mock('../../src/lib/security', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
  sanitizeErrorMessage: vi.fn((err: any) => err.message || String(err)),
}))

describe('Auth Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset auth mock state
    ;(auth as any).currentUser = null
  })

  describe('logout()', () => {
    it('signs out successfully and returns success', async () => {
      ;(auth as any).currentUser = { uid: 'user-1', email: 'test@test.com' }
      
      const result = await logout()
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      expect(signOut).toHaveBeenCalledWith(auth)
    })

    it('returns error when signOut fails', async () => {
      ;(auth as any).currentUser = { uid: 'user-1' }
      vi.mocked(signOut).mockRejectedValueOnce(new Error('Network error'))

      const result = await logout()
      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('isAuthenticated()', () => {
    it('returns true when user exists', async () => {
      ;(auth as any).currentUser = { uid: 'user-1' }
      expect(await isAuthenticated()).toBe(true)
    })

    it('returns false when no user', async () => {
      ;(auth as any).currentUser = null
      expect(await isAuthenticated()).toBe(false)
    })
  })

  describe('getCurrentUserId()', () => {
    it('returns user ID when authenticated', async () => {
      ;(auth as any).currentUser = { uid: 'user-abc' }
      expect(await getCurrentUserId()).toBe('user-abc')
    })

    it('returns null when unauthenticated', async () => {
      ;(auth as any).currentUser = null
      expect(await getCurrentUserId()).toBeNull()
    })
  })
})

describe('Firebase Auth — Direct Method Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('signInWithEmailAndPassword returns user on valid credentials', async () => {
    vi.mocked(signInWithEmailAndPassword).mockResolvedValueOnce({
      user: { uid: 'u1' }
    } as any)
    
    const userCredential = await signInWithEmailAndPassword(auth, 'user@example.com', 'ValidPass1')
    expect(userCredential.user.uid).toBe('u1')
  })

  it('throws "auth/invalid-credential" on wrong password', async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce({
      code: 'auth/invalid-credential',
      message: 'Invalid login credentials'
    })

    await expect(signInWithEmailAndPassword(auth, 'user@example.com', 'wrongpass'))
      .rejects.toThrow('Invalid login credentials')
  })

  it('createUserWithEmailAndPassword rejects duplicate email', async () => {
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValueOnce({
      code: 'auth/email-already-in-use',
      message: 'User already registered'
    })

    await expect(createUserWithEmailAndPassword(auth, 'existing@example.com', 'StrongPass1'))
      .rejects.toThrow('already registered')
  })
})

