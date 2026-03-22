
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthView } from '../../src/pages/AuthView';
import { auth, isFirebaseConfigured } from '../../src/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { ToastProvider } from '../../src/components/Toast';

// Note: firebase modular functions are mocked in tests/setup.ts via src/lib/__mocks__/firebase.ts

describe('Auth UI Logic (Firebase)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (auth as any).currentUser = null;
        vi.mocked(isFirebaseConfigured).mockReturnValue(true);
    });

    const renderAuth = () => {
        return render(
            <BrowserRouter>
                <ToastProvider>
                    <AuthView />
                </ToastProvider>
            </BrowserRouter>
        );
    };

    it('switches between Login, Signup, and Phone modes', () => {
        renderAuth();

        // Default is login
        expect(screen.getByText('Sign In Securely')).toBeTruthy();

        // Switch to Signup
        fireEvent.click(screen.getByRole('button', { name: /signup/i }));
        expect(screen.getByText('Create Island Account')).toBeTruthy();
        expect(screen.getByLabelText(/Display Name/i)).toBeTruthy();

        // Switch to Phone
        fireEvent.click(screen.getByRole('button', { name: /phone/i }));
        expect(screen.getByText('Get OTP')).toBeTruthy();
        expect(screen.getByLabelText(/Phone Number/i)).toBeTruthy();
    });

    it('validates password strength in Signup mode', async () => {
        renderAuth();
        fireEvent.click(screen.getByRole('button', { name: /signup/i }));

        const passwordInput = screen.getByLabelText(/Secret Password/i);

        // Weak password
        fireEvent.change(passwordInput, { target: { value: 'weak' } });
        expect(screen.getByText(/○ 8\+ chars/i)).toBeTruthy();
        expect(screen.getByText(/○ Uppercase/i)).toBeTruthy();

        // Stronger password
        fireEvent.change(passwordInput, { target: { value: 'StrongPass1' } });
        expect(screen.getByText(/✓ 8\+ chars/i)).toBeTruthy();
        expect(screen.getByText(/✓ Uppercase/i)).toBeTruthy();
        expect(screen.getByText(/✓ Lowercase/i)).toBeTruthy();
        expect(screen.getByText(/✓ Number/i)).toBeTruthy();
    });

    it('handles email login submission', async () => {
        const user = userEvent.setup();
        const mockUser = { uid: 'test-user', email: 'test@example.com', emailVerified: true };
        vi.mocked(signInWithEmailAndPassword).mockResolvedValue({ user: mockUser } as any);
        
        renderAuth();

        await user.type(screen.getByLabelText(/Email Address/i), 'test@example.com');
        await user.type(screen.getByLabelText(/Secret Password/i), 'Password123!');
        await user.click(screen.getByRole('button', { name: /Sign In Securely/i }));

        await waitFor(() => {
            expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'test@example.com', 'Password123!');
        }, { timeout: 5000 });
    });

    it('handles signup submission', async () => {
        const user = userEvent.setup();
        const mockUser = { uid: 'new-user', email: 'new@example.com', emailVerified: false };
        vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({ user: mockUser } as any);
        
        renderAuth();
        await user.click(screen.getByRole('button', { name: /signup/i }));

        await user.type(screen.getByLabelText(/Display Name/i), 'New User');
        await user.type(screen.getByLabelText(/Email Address/i), 'new@example.com');
        await user.type(screen.getByLabelText(/Secret Password/i), 'StrongPass1!');
        
        const submitBtn = screen.getByRole('button', { name: /Create Island Account/i });
        await user.click(submitBtn);

        await waitFor(() => {
            expect(createUserWithEmailAndPassword).toHaveBeenCalled();
        }, { timeout: 5000 });
        
        expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, 'new@example.com', 'StrongPass1!');
    });

    it('shows error message if firebase is not configured', () => {
        vi.mocked(isFirebaseConfigured).mockReturnValue(false);

        renderAuth();
        expect(screen.getByText(/Auth is not configured/i)).toBeTruthy();
    });
});
