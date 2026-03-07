import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../src/lib/supabase', () => import('../../src/lib/__mocks__/supabase'))

import { supabase, createMockChain } from '../../src/lib/__mocks__/supabase'
import { Admin } from '../../src/pages/Admin'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../src/components/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

const makeCountChain = (count: number) => ({
  select: vi.fn().mockReturnValue({ then: (cb: (v: unknown) => unknown) => Promise.resolve({ count, error: null }).then(cb) }),
})

function renderAdmin() {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: ['/admin'] },
      React.createElement(Admin)
    )
  )
}

describe('Admin authorization extended checks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockReset()
  })

  it('blocks non-admin user and redirects to home', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: 'user-1' } },
      error: null,
    } as any)

    const roleChain = createMockChain(null, null)
    roleChain.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } })
    vi.mocked(supabase.from).mockReturnValueOnce(roleChain as any)

    renderAdmin()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('redirects unauthenticated users to auth', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: null },
      error: null,
    } as any)

    renderAdmin()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth')
    })
  })

  it('allows admin and fetches dashboard queries', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: { id: 'admin-1' } },
      error: null,
    } as any)

    const roleChain = createMockChain({ role: 'admin' }, null)
    vi.mocked(supabase.from).mockReturnValueOnce(roleChain as any)

    vi.mocked(supabase.from)
      .mockReturnValueOnce(makeCountChain(100) as any)
      .mockReturnValueOnce(makeCountChain(75) as any)
      .mockReturnValueOnce(makeCountChain(4) as any)
      .mockReturnValueOnce(makeCountChain(300) as any)
      .mockReturnValueOnce(createMockChain([], null) as any)

    renderAdmin()

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalledWith('/auth')
      expect(mockNavigate).not.toHaveBeenCalledWith('/')
    })
  })
})
