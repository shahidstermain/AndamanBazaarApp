/**
 * PHASE 2 — Admin Authorization Tests
 * Covers: non-admin access blocked, admin access granted, role check flow
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { auth } from '../../src/lib/firebase'
import { getDocs, getDoc } from 'firebase/firestore'

// Use the global mock from setup.ts
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
    ;(auth as any).currentUser = null
  })

  it('redirects unauthenticated user to /auth', async () => {
    (auth as any).currentUser = null

    renderAdmin()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth')
    })
  })

  it('redirects non-admin user to / with toast', async () => {
    (auth as any).currentUser = { uid: 'regular-user' }

    // Mock empty roles check
    vi.mocked(getDocs).mockResolvedValueOnce({
      empty: true,
      docs: [],
      size: 0
    } as any)

    renderAdmin()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('shows dashboard when user has admin role', async () => {
    (auth as any).currentUser = { uid: 'admin-user' }

    // Mock getDocs to return different data based on the collection being queried
    const createMockSnap = (size: number, data = {}) => ({
      size,
      empty: size === 0,
      docs: Array(size).fill(0).map((_, i) => ({ 
        id: `id-${i}`, 
        data: () => data,
        exists: () => true 
      })),
      forEach(cb: any) { this.docs.forEach(cb); }
    } as any);

    vi.mocked(getDocs).mockImplementation(async (q: any) => {
      let path = '';
      if (typeof q === 'string') path = q;
      else if (q?.path) path = q.path;
      else if (q?.collection?.path) path = q.collection.path;
      else if (q?._path?.segments) path = q._path.segments.join('/');
      
      console.log('MOCK getDocs - PATH:', path, 'TYPE:', q?.type, 'isQuery:', !!q?.clauses);
      
      if (path.includes('user_roles')) return createMockSnap(1, { role: 'admin', user_id: 'admin-user' });
      if (path.includes('listings')) return createMockSnap(q?.type === 'query' ? 51 : 50);
      if (path.includes('reports')) return createMockSnap(5, { reason: 'test_reason', status: 'pending', created_at: { toDate: () => new Date() } });
      if (path.includes('profiles')) return createMockSnap(100);
      
      return createMockSnap(0);
    });

    const i = 0; // for reports toggling if needed
    
    renderAdmin()

    await waitFor(() => {
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
    }, { timeout: 4000 })
    
    // Check if stats are rendered
    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument()
      expect(screen.getByText('51')).toBeInTheDocument()
      expect(screen.getByText(/5 listings queue mein hain/)).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
    }, { timeout: 4000 })
  })

  it('shows verifying access state initially', () => {
    (auth as any).currentUser = { uid: 'some-user' }
    // Never resolve the role check
    vi.mocked(getDocs).mockReturnValueOnce(new Promise(() => {}))

    renderAdmin()
    expect(screen.getByText(/Verifying Access/i)).toBeInTheDocument()
  })
})

