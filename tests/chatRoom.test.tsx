
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ChatRoom } from '../src/pages/ChatRoom';
import { auth, db } from '../src/lib/firebase';
import { getDoc, getDocs, addDoc, onSnapshot, doc, collection, query, where, orderBy } from 'firebase/firestore';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../src/components/Toast';

// Note: firebase mocks are handled globally in tests/setup.ts

describe('ChatRoom View', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Default mock user
        (auth as any).currentUser = { uid: 'user-123' };

        // Mock onSnapshot to call callback immediately with empty docs by default
        vi.mocked(onSnapshot).mockImplementation((q: any, cb: any) => {
            cb({
                docs: [],
                forEach(f: any) { this.docs.forEach(f); }
            });
            return () => {};
        });
    });

    const renderChatRoom = (id: string = 'chat-1') => {
        render(
            <ToastProvider>
                <MemoryRouter initialEntries={[`/chats/${id}`]}>
                    <Routes>
                        <Route path="/chats/:chatId" element={<ChatRoom />} />
                    </Routes>
                </MemoryRouter>
            </ToastProvider>
        );
    };

    it('renders chat room and fetches data correctly', async () => {
        const mockChat = {
            id: 'chat-1',
            listing_id: 'listing-1',
            buyer_id: 'user-123',
            seller_id: 'seller-456',
            buyer_unread_count: 0,
            seller_unread_count: 0,
            last_message_at: new Date().toISOString()
        };
        const mockListing = { id: 'listing-1', title: 'Beach House', price: 5000, user_id: 'seller-456' };
        const mockSeller = { id: 'seller-456', name: 'John Doe', profile_photo_url: null };
        const mockBuyer = { id: 'user-123', name: 'Me', profile_photo_url: null };

        const mockMessages = [
            { id: 'msg-1', chat_id: 'chat-1', sender_id: 'seller-456', message_text: 'Hello!', created_at: { toMillis: () => Date.now() } }
        ];

        // Mock getDoc for chat, listing, seller, buyer
        vi.mocked(getDoc).mockImplementation(async (docRef: any) => {
            const path = docRef.path || '';
            if (path.includes('chats/chat-1')) return { exists: () => true, id: 'chat-1', data: () => mockChat } as any;
            if (path.includes('listings/listing-1')) return { exists: () => true, id: 'listing-1', data: () => mockListing } as any;
            if (path.includes('profiles/seller-456')) return { exists: () => true, id: 'seller-456', data: () => mockSeller } as any;
            if (path.includes('profiles/user-123')) return { exists: () => true, id: 'user-123', data: () => mockBuyer } as any;
            return { exists: () => false, data: () => null } as any;
        });

        // Mock onSnapshot for messages
        vi.mocked(onSnapshot).mockImplementation((q: any, cb: any) => {
            cb({
                docs: mockMessages.map(m => ({
                    id: m.id,
                    data: () => m,
                    exists: () => true
                })),
                forEach(f: any) { this.docs.forEach(f); }
            });
            return () => {};
        });

        renderChatRoom('chat-1');

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Hello!')).toBeInTheDocument();
        }, { timeout: 4000 });
    });

    it('sends a message successfully', async () => {
        const mockChat = { id: 'chat-1', listing_id: 'listing-1', buyer_id: 'user-123', seller_id: 'seller-456' };

        vi.mocked(getDoc).mockImplementation(async (docRef: any) => {
            const path = docRef.path || '';
            if (path.includes('chats/chat-1')) return { exists: () => true, id: 'chat-1', data: () => mockChat } as any;
            return { exists: () => true, data: () => ({ name: 'John' }) } as any;
        });

        renderChatRoom('chat-1');

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Type your message/i)).toBeInTheDocument();
        }, { timeout: 4000 });

        const input = screen.getByPlaceholderText(/Type your message/i);
        const sendButton = screen.getByTestId('send-button');

        fireEvent.change(input, { target: { value: 'New Message' } });
        fireEvent.click(sendButton);

        await waitFor(() => {
            expect(addDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    message_text: 'New Message',
                    sender_id: 'user-123'
                })
            );
        }, { timeout: 4000 });
    });
});
