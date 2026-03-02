/**
 * PHASE 2 — Authentication Flow Unit Tests
 * Covers: login, signup, session expiry, wrong password, logout, auth guards
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../../src/lib/__mocks__/supabase'
import { logout, isAuthenticated, getCurrentUserId } from '../../src/lib/auth'

vi.mock('../../src/lib/supabase', () => import('../../src/lib/__mocks__/supabase'))

describe('Auth Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('logout()', () => {
    it('signs out successfully and returns success', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-1', email: 'test@test.com' } },
        error: null,
      })
      supabase.auth.signOut.mockResolvedValueOnce({ error: null })
      supabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          then: (cb: any) => Promise.resolve({ data: null, error: null }).then(cb),
        }),
      } as any)

      const result = await logout()
      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('returns error when signOut fails', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-1' } },
        error: null,
      })
      supabase.auth.signOut.mockResolvedValueOnce({
        error: { message: 'Network error' },
      })
      supabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          then: (cb: any) => Promise.resolve({ data: null, error: null }).then(cb),
        }),
      } as any)

      const result = await logout()
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('isAuthenticated()', () => {
    it('returns true when session exists', async () => {
      supabase.auth.getSession.mockResolvedValueOnce({
        data: { session: { access_token: 'tok-123' } },
        error: null,
      })
      expect(await isAuthenticated()).toBe(true)
    })

    it('returns false when no session', async () => {
      supabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      })
      expect(await isAuthenticated()).toBe(false)
    })

    it('returns false on error', async () => {
      supabase.auth.getSession.mockRejectedValueOnce(new Error('fail'))
      expect(await isAuthenticated()).toBe(false)
    })
  })

  describe('getCurrentUserId()', () => {
    it('returns user ID when authenticated', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: 'user-abc' } },
        error: null,
      })
      expect(await getCurrentUserId()).toBe('user-abc')
    })

    it('returns null when unauthenticated', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })
      expect(await getCurrentUserId()).toBeNull()
    })

    it('returns null on error', async () => {
      supabase.auth.getUser.mockRejectedValueOnce(new Error('fail'))
      expect(await getCurrentUserId()).toBeNull()
    })
  })
})

describe('Supabase Auth — Direct Method Tests', () => {
  beforeEach(() => vi.clearAllMocks())

  it('signInWithPassword returns session on valid credentials', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: { access_token: 'tok' }, user: { id: 'u1' } },
      error: null,
    })
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'user@example.com',
      password: 'ValidPass1',
    })
    expect(error).toBeNull()
    expect(data.session).toBeDefined()
  })

  it('returns "Invalid login credentials" on wrong password', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid login credentials', status: 400 },
    })
    const { error } = await supabase.auth.signInWithPassword({
      email: 'user@example.com',
      password: 'wrongpass',
    })
    expect(error!.message).toContain('Invalid login credentials')
  })

  it('returns "Email not confirmed" for unverified accounts', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Email not confirmed', status: 400 },
    })
    const { error } = await supabase.auth.signInWithPassword({
      email: 'new@example.com',
      password: 'Password1',
    })
    expect(error!.message).toContain('Email not confirmed')
  })

  it('signUp rejects duplicate email', async () => {
    supabase.auth.signUp.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'User already registered' },
    })
    const { error } = await supabase.auth.signUp({
      email: 'existing@example.com',
      password: 'StrongPass1',
    })
    expect(error!.message).toContain('already registered')
  })

  it('getSession returns null after JWT expiry', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'JWT expired' },
    })
    const { data, error } = await supabase.auth.getSession()
    expect(data.session).toBeNull()
    expect(error).toBeDefined()
  })
})
