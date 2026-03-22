
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BoostSuccess } from '../src/pages/BoostSuccess';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { getDocs } from 'firebase/firestore';

// Note: firebase mocks are handled globally in tests/setup.ts

describe('BoostSuccess Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderBoostSuccess = (orderId: string = 'order_123') => {
        render(
            <MemoryRouter initialEntries={[`/boost/success?order_id=${orderId}`]}>
                <Routes>
                    <Route path="/boost/success" element={<BoostSuccess />} />
                </Routes>
            </MemoryRouter>
        );
    };

    it('should show success state when order is paid', async () => {
        const mockBoostData = {
            listing_id: 'listing_123',
            cashfree_order_id: 'order_123',
            status: 'paid'
        };

        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: false,
            docs: [{
                id: 'boost_1',
                data: () => mockBoostData,
                exists: () => true
            }],
            forEach(f: any) { this.docs.forEach(f); }
        } as any);

        renderBoostSuccess();

        await waitFor(() => {
            expect(screen.getByText(/Payment Successful/i)).toBeInTheDocument();
            expect(screen.getByText(/Boost active/i)).toBeInTheDocument();
        }, { timeout: 4000 });
    });

    it('should show failure state when order is failed', async () => {
        const mockBoostData = {
            listing_id: 'listing_123',
            cashfree_order_id: 'order_123',
            status: 'failed'
        };

        vi.mocked(getDocs).mockResolvedValueOnce({
            empty: false,
            docs: [{
                id: 'boost_1',
                data: () => mockBoostData,
                exists: () => true
            }],
            forEach(f: any) { this.docs.forEach(f); }
        } as any);

        renderBoostSuccess();

        await waitFor(() => {
            expect(screen.getByText(/Payment Failed/i)).toBeInTheDocument();
        }, { timeout: 4000 });
    });

    it('should show success state ultimately if initially pending', async () => {
        const mockPendingData = { status: 'pending' };

        // Mock first call as pending, second as paid
        vi.mocked(getDocs)
            .mockResolvedValueOnce({
                empty: false,
                docs: [{ id: 'b1', data: () => mockPendingData, exists: () => true }],
                forEach(f: any) { this.docs.forEach(f); }
            } as any)
            .mockResolvedValueOnce({
                empty: false,
                docs: [{ id: 'b1', data: () => ({ status: 'paid', listing_id: 'l1' }), exists: () => true }],
                forEach(f: any) { this.docs.forEach(f); }
            } as any);

        vi.useFakeTimers();
        renderBoostSuccess();
        
        expect(screen.getByText(/Verifying Payment/i)).toBeInTheDocument();

        // Advance timers and run microtasks
        await vi.advanceTimersByTimeAsync(3500);
        
        await waitFor(() => {
            expect(screen.getByText(/Payment Successful/i)).toBeInTheDocument();
        }, { timeout: 4000 });
        
        vi.useRealTimers();
    });
});
