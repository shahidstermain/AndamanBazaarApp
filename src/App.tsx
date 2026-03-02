import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './lib/supabase';

import { Home } from './pages/Home';
import { Listings } from './pages/Listings';
import { ListingDetail } from './pages/ListingDetail';
import { CreateListing } from './pages/CreateListing';
import { ChatList } from './pages/ChatList';
import { ChatRoom } from './pages/ChatRoom';
import { Profile } from './pages/Profile';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import { AuthView } from './pages/AuthView';
import { BoostSuccess } from './pages/BoostSuccess';
import { Todos } from './pages/Todos';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import { About } from './pages/About';
import { Pricing } from './pages/Pricing';
import { ContactUs } from './pages/ContactUs';
import Planner from './pages/Planner';
import { NotFound } from './pages/NotFound';

import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { retryAsync, isTransientError } from './lib/security';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const bypassAuth =
    import.meta.env.VITE_E2E_BYPASS_AUTH === 'true' ||
    new URLSearchParams(window.location.search).get('e2e') === '1';

  useEffect(() => {
    if (bypassAuth) {
      setUser(({ id: 'e2e-user', email: 'e2e@example.com' } as unknown) as User);
      setLoading(false);
      return;
    }
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const ensureProfileExists = async (user: User) => {
      try {
        const profileResponse = await retryAsync(async () => {
          const response = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();
          if (response.error && isTransientError(response.error)) {
            throw response.error;
          }
          return response;
        }, { label: 'profiles.select', maxAttempts: 3 });

        if (profileResponse.error && profileResponse.error.code === 'PGRST116') {
          const insertResponse = await retryAsync(async () => {
            const response = await supabase.from('profiles').insert({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name || 'Island User',
              profile_photo_url: user.user_metadata?.avatar_url || '',
              phone_number: user.phone || null,
            });
            if (response.error && isTransientError(response.error)) {
              throw response.error;
            }
            return response;
          }, { label: 'profiles.insert', maxAttempts: 3 });

          if (insertResponse.error) {
            console.error('Profile insert failed:', insertResponse.error);
          }
        } else if (profileResponse.error) {
          console.error('Profile lookup failed:', profileResponse.error);
        }
      } catch (err) {
        console.error('Profile fallback error:', err);
      }
    };

    const getSession = async () => {
      try {
        const sessionResponse = await retryAsync(async () => {
          const response = await supabase.auth.getSession();
          if (response.error && isTransientError(response.error)) {
            throw response.error;
          }
          return response;
        }, { label: 'auth.getSession', maxAttempts: 4, baseDelayMs: 300, maxDelayMs: 5000 });

        if (sessionResponse.error) {
          console.error('Session fetch failed:', sessionResponse.error);
          return;
        }

        const currentUser = sessionResponse.data.session?.user ?? null;
        setUser(currentUser);
        if (currentUser) await ensureProfileExists(currentUser);
      } catch (err) {
        console.error('Session retry failed:', err);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser && _event === 'SIGNED_IN') {
        await ensureProfileExists(currentUser);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [bypassAuth]);

  const RequireAuth = ({ children, user, loading }: { children: React.ReactNode, user: User | null, loading: boolean }) => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
        </div>
      );
    }
    return user ? <>{children}</> : <Navigate to="/auth" />;
  };

  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Layout user={user}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/listings" element={<Listings />} />
              <Route path="/listings/:id" element={<ListingDetail />} />
              <Route path="/post" element={<RequireAuth user={user} loading={loading}><CreateListing /></RequireAuth>} />
              <Route path="/chats" element={<RequireAuth user={user} loading={loading}><ChatList /></RequireAuth>} />
              <Route path="/chats/:chatId" element={<RequireAuth user={user} loading={loading}><ChatRoom /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth user={user} loading={loading}><Profile /></RequireAuth>} />
              <Route path="/dashboard" element={<RequireAuth user={user} loading={loading}><Dashboard /></RequireAuth>} />
              <Route path="/admin" element={<RequireAuth user={user} loading={loading}><Admin /></RequireAuth>} />
              <Route path="/auth" element={<AuthView />} />
              <Route path="/boost-success" element={<RequireAuth user={user} loading={loading}><BoostSuccess /></RequireAuth>} />
              <Route path="/todos" element={<Todos />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/about" element={<About />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/planner" element={<RequireAuth user={user} loading={loading}><Planner /></RequireAuth>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );

};

export default App;
