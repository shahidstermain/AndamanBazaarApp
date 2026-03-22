
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CreateListing } from '../src/pages/CreateListing';
import { auth, db } from '../src/lib/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { MemoryRouter } from 'react-router-dom';

// Note: firebase mocks are handled globally in tests/setup.ts

describe('CreateListing View', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock user
        ;(auth as any).currentUser = { uid: 'user-123' };

        // Mock profile for location verification
        vi.mocked(getDoc).mockImplementation(async (docRef: any) => {
            if (docRef.path?.includes('profiles/user-123')) {
                return {
                    exists: () => true,
                    data: () => ({ is_location_verified: true })
                } as any;
            }
            return { exists: () => false, data: () => null } as any;
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
        }, { timeout: 4000 });
    });

    it('shows optimized image text when no photos added', async () => {
        renderCreateListing();

        await waitFor(() => {
            expect(screen.getByText(/photo lagao/i)).toBeInTheDocument();
            expect(screen.getByText(/AI-optimized automatically/i)).toBeInTheDocument();
        }, { timeout: 4000 });
    });
});
