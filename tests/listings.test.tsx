
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Listings } from '../src/pages/Listings';
import { auth, db } from '../src/lib/firebase';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { vi, beforeEach, describe, it, expect } from 'vitest';

// Note: firebase mocks are handled globally in tests/setup.ts

describe('Listings View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock user (not logged in)
    ;(auth as any).currentUser = null;

    // Default mock implementation for getDocs (empty)
    vi.mocked(getDocs).mockImplementation(async (q: any) => {
      return {
        size: 0,
        empty: true,
        docs: [],
        forEach(cb: any) { this.docs.forEach(cb); }
      } as any;
    });
  });

  const renderListings = () => {
    return render(
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
    }, { timeout: 4000 });
  });

  it('renders categories', async () => {
    renderListings();
    await waitFor(() => {
      expect(screen.getByText(/Fresh Catch/i)).toBeInTheDocument();
      expect(screen.getByText(/Produce/i)).toBeInTheDocument();
      expect(screen.getByText(/Handicrafts/i)).toBeInTheDocument();
    }, { timeout: 4000 });
  });

  it('shows no results found for unmatched search', async () => {
    // Already mocked to return empty
    render(
      <MemoryRouter initialEntries={['/listings?q=xyznonexistentterm']}>
        <Listings />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Andaman mein koi seller nahi/i)).toBeInTheDocument();
    }, { timeout: 4000 });
  });
});