/**
 * PHASE 2 — Admin Authorization Tests
 * Covers: non-admin access blocked, admin access granted, role check flow
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { supabase } from '../../src/lib/__mocks__/supabase'
import { createMockChain } from '../../src/lib/__mocks__/supabase'

vi.mock('../../src/lib/supabase', () => import('../../src/lib/__mocks__/supabase'))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { Admin } from '../../src/pages/Admin'

function renderAdmin() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Admin />
    </MemoryRouter>
  )
}

describe('Admin Page — Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockReset()
  })

  it('redirects unauthenticated user to /auth', async () => {
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    renderAdmin()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth')
    })
  })

  it('redirects non-admin user to / with toast', async () => {
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'regular-user' } },
      error: null,
    })

    const roleChain = createMockChain(null, null)
    roleChain.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } })
    supabase.from.mockReturnValueOnce(roleChain as any)

    renderAdmin()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('shows dashboard when user has admin role', async () => {
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'admin-user' } },
      error: null,
    })

    const roleChain = createMockChain({ role: 'admin' }, null)
    supabase.from.mockReturnValueOnce(roleChain as any)

    const statsChains = [
      { select: vi.fn().mockReturnValue({ then: (cb: any) => Promise.resolve({ count: 50, error: null }).then(cb) }) },
      { select: vi.fn().mockReturnValue({ then: (cb: any) => Promise.resolve({ count: 30, error: null }).then(cb) }) },
      { select: vi.fn().mockReturnValue({ then: (cb: any) => Promise.resolve({ count: 5, error: null }).then(cb) }) },
      { select: vi.fn().mockReturnValue({ then: (cb: any) => Promise.resolve({ count: 100, error: null }).then(cb) }) },
    ]
    for (const chain of statsChains) {
      supabase.from.mockReturnValueOnce(chain as any)
    }

    const reportsChain = createMockChain([], null)
    supabase.from.mockReturnValueOnce(reportsChain as any)

    renderAdmin()

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
    })
  })

  it('shows verifying access state initially', () => {
    supabase.auth.getUser.mockReturnValueOnce(new Promise(() => {}))

    renderAdmin()
    expect(screen.getByText(/Verifying Access/i)).toBeInTheDocument()
  })
})
