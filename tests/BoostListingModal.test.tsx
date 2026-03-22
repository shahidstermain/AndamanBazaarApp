
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BoostListingModal } from '../src/components/BoostListingModal';
import { auth } from '../src/lib/firebase';

// Note: firebase mocks are handled globally in tests/setup.ts

describe('BoostListingModal Component', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        listingId: 'mock-listing-123',
        listingTitle: 'Test Island Land',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset window.location mock
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { href: vi.fn() },
        });

        // Mock global fetch
        global.fetch = vi.fn();
    });

    it('should not render when isOpen is false', () => {
        render(<BoostListingModal {...defaultProps} isOpen={false} />);
        expect(screen.queryByText(/Boost Your Listing/i)).not.toBeInTheDocument();
    });

    it('should render all 3 tiers with correct pricing when open', () => {
        render(<BoostListingModal {...defaultProps} />);

        expect(screen.getByText('Boost Your Listing')).toBeInTheDocument();
        expect(screen.getByText('Test Island Land')).toBeInTheDocument();

        // Tier Names
        expect(screen.getByText('Spark')).toBeInTheDocument();
        expect(screen.getByText('Boost')).toBeInTheDocument();
        expect(screen.getByText('Power')).toBeInTheDocument();

        // Pricing
        expect(screen.getByText('₹49')).toBeInTheDocument();
        expect(screen.getByText('₹99')).toBeInTheDocument();
        expect(screen.getByText('₹199')).toBeInTheDocument();
    });

    it('should allow user to change selected tier and update the checkout button price', async () => {
        render(<BoostListingModal {...defaultProps} />);

        // Setup initial default (Boost)
        expect(screen.getByText(/Pay ₹99 Securely/i)).toBeInTheDocument();

        // Click on Spark Tier
        const sparkTier = screen.getByText('Spark');
        fireEvent.click(sparkTier);

        // Assert button price updated
        await waitFor(() => {
            expect(screen.getByText(/Pay ₹49 Securely/i)).toBeInTheDocument();
        });

        // Click on Power Tier
        const powerTier = screen.getByText('Power');
        fireEvent.click(powerTier);

        // Assert button price updated
        await waitFor(() => {
            expect(screen.getByText(/Pay ₹199 Securely/i)).toBeInTheDocument();
        });
    });

    it('should show an error toast and abort if the user is not signed in', async () => {
        ;(auth as any).currentUser = null;
        render(<BoostListingModal {...defaultProps} />);

        const payButton = screen.getByText(/Pay ₹99 Securely/i);
        fireEvent.click(payButton);

        await waitFor(() => {
            expect(global.fetch).not.toHaveBeenCalled();
        });
    });

    it('should call the createBoostOrder function and redirect to Cashfree on success', async () => {
        // Mock authenticated user
        const mockUser = {
            uid: 'user-123',
            getIdToken: vi.fn().mockResolvedValue('mock-id-token')
        };
        ;(auth as any).currentUser = mockUser;

        // Mock fetch response returning a cashfree payment link
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                payment_link: 'https://cashfree.com/mock-payment-url'
            })
        } as any);

        render(<BoostListingModal {...defaultProps} />);

        const payButton = screen.getByText(/Pay ₹99 Securely/i);
        fireEvent.click(payButton);

        // Expect loading state
        expect(screen.getByText(/Creating Payment.../i)).toBeInTheDocument();

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/createBoostOrder'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer mock-id-token'
                    }),
                    body: JSON.stringify({
                        listing_id: 'mock-listing-123',
                        tier: 'boost'
                    })
                })
            );

            // Expect window redirect to trigger
            expect(window.location.href).toBe('https://cashfree.com/mock-payment-url');
        }, { timeout: 4000 });
    });
});
