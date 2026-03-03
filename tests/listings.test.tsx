import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Listings } from '../src/pages/Listings';
import { supabase } from '../src/lib/supabase';
import { vi } from 'vitest';
import { createMockChain } from './setup';

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn(),
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));


describe('Listings View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderListings = () => {
    (supabase.from as any).mockReturnValue(createMockChain([]));
    render(
      <MemoryRouter initialEntries={['/listings']}>
        <Listings />
      </MemoryRouter>
    );
  };

  it('renders the search input', async () => {
    renderListings();
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/Search across the islands/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  it('renders categories', async () => {
    renderListings();
    await waitFor(() => {
      expect(screen.getByText(/Fresh Catch/i)).toBeInTheDocument();
      expect(screen.getByText(/Produce/i)).toBeInTheDocument();
      expect(screen.getByText(/Handicrafts/i)).toBeInTheDocument();
    });
  });

  it('shows no results found for unmatched search', async () => {
    (supabase.from as any).mockReturnValue(createMockChain([]));
    render(
      <MemoryRouter initialEntries={['/listings?q=xyznonexistentterm']}>
        <Listings />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Nothing found yet/i)).toBeInTheDocument();
    });
  });
});