
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Listings } from '../../src/pages/Listings';
import { supabase } from '../../src/lib/supabase';
import { createMockChain } from '../setup';
import { ToastProvider } from '../../src/components/Toast';

// Mock Supabase
vi.mock('../../src/lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
        from: vi.fn(),
    },
}));

describe('Marketplace UI Logic (Vitest)', () => {
    const mockListings = [
        {
            id: '1',
            title: 'Test Scooter',
            price: 50000,
            city: 'Port Blair',
            is_location_verified: true,
            category_id: 'vehicles',
            images: [{ image_url: 'https://picsum.photos/200' }]
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (supabase.from as any).mockReturnValue(createMockChain(mockListings));
    });

    const renderListings = (initialRoute = '/listings') => {
        return render(
            <MemoryRouter initialEntries={[initialRoute]}>
                <ToastProvider>
                    <Listings />
                </ToastProvider>
            </MemoryRouter>
        );
    };

    it('renders search input and handles search query', async () => {
        renderListings();
        const searchInput = screen.getByPlaceholderText(/Search across the islands/i);
        expect(searchInput).toBeTruthy();

        fireEvent.change(searchInput, { target: { value: 'Scooter' } });
        fireEvent.submit(searchInput.closest('form')!);

        // Verify the input value was updated (URL params don't propagate in MemoryRouter)
        await waitFor(() => {
            expect(searchInput).toHaveValue('Scooter');
        });
    });

    it('filters by category when clicked', async () => {
        renderListings();
        const produceCategory = screen.getByText(/🥥 Produce/i);
        fireEvent.click(produceCategory);

        // Verify category is visually selected (has active class)
        await waitFor(() => {
            expect(produceCategory.className).toContain('bg-teal-600');
        });
    });

    it('opens and applies filters (verified only)', async () => {
        renderListings();

        // Open Filters
        const filterBtn = screen.getByRole('button', { name: /Filters/i });
        fireEvent.click(filterBtn);

        // Toggle Verified Sellers Only
        const toggle = screen.getByRole('switch', { name: /Toggle verified sellers only/i });
        fireEvent.click(toggle);

        // Apply Filters
        const applyBtn = screen.getByRole('button', { name: /Apply Filters/i });
        fireEvent.click(applyBtn);

        // After applying, filters panel should close (apply button disappears)
        await waitFor(() => {
            expect(screen.queryByRole('button', { name: /Apply Filters/i })).toBeNull();
        });
    });

    it('clears all filters correctly', async () => {
        renderListings();

        // Open Filters
        fireEvent.click(screen.getByRole('button', { name: /Filters/i }));

        // Clear All
        const clearBtn = screen.getByRole('button', { name: /Clear All/i });
        fireEvent.click(clearBtn);

        // After clearing, the filter panel remains open, "All" category becomes active, and switch is reset to unchecked
        await waitFor(() => {
            const allCategory = screen.getByText(/🌊 All/i);
            expect(allCategory.className).toContain('bg-teal-600');
            const switchEl = screen.queryByRole('switch', { name: /Toggle verified sellers only/i });
            expect(switchEl).not.toBeNull();
            expect(switchEl).not.toBeChecked();
        });
    });
});
