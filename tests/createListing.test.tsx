
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateListing } from '../src/pages/CreateListing';
import { supabase } from '../src/lib/supabase';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../src/lib/supabase');

describe('CreateListing View', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock user
        vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null
        });

        // Mock profile for location verification
        vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
            if (table === 'profiles') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: { is_location_verified: true }, error: null }),
                };
            }
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
        });
    });

    const renderCreateListing = () => {
        render(
            <MemoryRouter>
                <CreateListing />
            </MemoryRouter>
        );
    };

    it('renders Step 1 (Photos) initially', async () => {
        renderCreateListing();

        await waitFor(() => {
            // Use exact match or more specific regex to avoid multiple matches
            expect(screen.getByRole('heading', { name: /Add Photos/i })).toBeInTheDocument();
            expect(screen.getByText(/Step 1 of 4/i)).toBeInTheDocument();
        });
    });

    // Since Step 1 requires images (which are hard to mock in happy-dom effortlessly without blob issues),
    // we'll verify the component structure and initial loading state.
    it('shows optimized image text when no photos added', async () => {
        renderCreateListing();

        await waitFor(() => {
            expect(screen.getByText(/photo lagao/i)).toBeInTheDocument();
            expect(screen.getByText(/AI-optimized automatically/i)).toBeInTheDocument();
        });
    });
});
