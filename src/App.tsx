import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './lib/firebase';

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
import { BecomeOperator } from './pages/BecomeOperator';
import { ActivitiesPage } from './pages/ActivitiesPage';
import ActivityDetail from './pages/ActivityDetail';
import { NotFound } from './pages/NotFound';

import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const bypassAuth =
    import.meta.env.VITE_E2E_BYPASS_AUTH === 'true' ||
    new URLSearchParams(window.location.search).get('e2e') === '1';

  useEffect(() => {
    if (bypassAuth) {
      setUser(({ uid: 'e2e-user', email: 'e2e@example.com' } as unknown) as User);
      setLoading(false);
      return;
    }
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    const ensureProfileExists = async (firebaseUser: User) => {
      try {
        const profileRef = doc(db, 'profiles', firebaseUser.uid);
        const profileSnap = await getDoc(profileRef);

        if (!profileSnap.exists()) {
          await setDoc(profileRef, {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || 'Island User',
            profile_photo_url: firebaseUser.photoURL || '',
            phone_number: firebaseUser.phoneNumber || null,
            city: 'Port Blair',
            area: null,
            is_location_verified: false,
            trust_level: 'newbie',
            total_listings: 0,
            successful_sales: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Profile creation error:', err);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await ensureProfileExists(firebaseUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
              <Route path="/become-operator" element={<RequireAuth user={user} loading={loading}><BecomeOperator /></RequireAuth>} />
              <Route path="/activities" element={<ActivitiesPage />} />
              <Route path="/activities/:id" element={<ActivityDetail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );

};

export default App;
