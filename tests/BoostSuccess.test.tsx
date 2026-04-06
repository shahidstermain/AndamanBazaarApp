import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BoostSuccess } from '../src/pages/BoostSuccess';
import { supabase } from '../src/lib/supabase';

vi.mock('../src/lib/supabase');
import { MemoryRouter } from 'react-router-dom';

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('lucide-react')>();
    return {
        ...actual,
        Loader2: () => <div data-testid="Loader2" />,
        CheckCircle: () => <div data-testid="CheckCircle" />,
        XCircle: () => <div data-testid="XCircle" />
    };
});

describe('BoostSuccess View', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const renderWithRouter = (initialEntries: string[]) => {
        return render(
            <MemoryRouter initialEntries={initialEntries}>
                <BoostSuccess />
            </MemoryRouter>
        );
    };

    it('should show failure state if there is no order_id in params', () => {
        renderWithRouter(['/boost-success']);
        expect(screen.getByText('Payment Failed')).toBeInTheDocument();
        expect(screen.queryByText('Verifying Payment...')).not.toBeInTheDocument();
    });

    it('should immediately show success if the database says status is paid', async () => {
        vi.mocked(supabase.from).mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
                data: { status: 'paid', listing_id: 'listing-123' },
                error: null
            })
        } as any);

        renderWithRouter(['/boost-success?order_id=ord_123']);

        // Shows loading initially
        expect(screen.getByText('Verifying Payment...')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
            expect(screen.getByText(/Boost chal gaya!/i)).toBeInTheDocument();
        });
    });

    it('should immediately show failed if the database says status is failed or refunded', async () => {
        vi.mocked(supabase.from).mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValueOnce({
                data: { status: 'failed', listing_id: 'listing-123' },
                error: null
            })
        } as any);

        renderWithRouter(['/boost-success?order_id=ord_123']);

        await waitFor(() => {
            expect(screen.getByText('Payment Failed')).toBeInTheDocument();
            expect(screen.getByText(/We couldn't process your payment/i)).toBeInTheDocument();
        });
    });

    it('should poll a second time after 3 seconds if status is pending and resolve successfully', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const mockSupabaseChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn()
        };
        vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any);

        // First call: pending
        mockSupabaseChain.single.mockResolvedValueOnce({
            data: { status: 'pending', listing_id: 'listing-123' },
            error: null
        });

        // Second call: paid (after 3 secs)
        mockSupabaseChain.single.mockResolvedValueOnce({
            data: { status: 'paid', listing_id: 'listing-123' },
            error: null
        });

        renderWithRouter(['/boost-success?order_id=ord_123']);

        // Verify it stays loading
        await waitFor(() => {
            expect(screen.getByText('Verifying Payment...')).toBeInTheDocument();
        });

        // Advance 3 seconds for the setTimeout (async version handles promises)
        await vi.advanceTimersByTimeAsync(3000);

        await waitFor(() => {
            expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
        });

        // single() should have been called twice
        expect(mockSupabaseChain.single).toHaveBeenCalledTimes(2);
    }, 15000);

    it('should handle errors gracefully and show failed state', async () => {
        vi.mocked(supabase.from).mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockRejectedValueOnce(new Error('Network error'))
        } as any);

        renderWithRouter(['/boost-success?order_id=ord_123']);

        await waitFor(() => {
            expect(screen.getByText('Payment Failed')).toBeInTheDocument();
        });
    });
});
