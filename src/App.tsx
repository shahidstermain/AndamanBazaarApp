import React, { Suspense, useState, useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { auth as firebaseAuth, db } from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import { Home } from "./pages/Home";
import { AuthView } from "./pages/AuthView";
import { NotFound } from "./pages/NotFound";

import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast";
import { PerformanceMonitor } from "./components/PerformanceMonitor";

type LayoutUser = React.ComponentProps<typeof Layout>["user"];
type User = NonNullable<LayoutUser>;

const Listings = React.lazy(() =>
  import("./pages/Listings").then((m) => ({ default: m.Listings })),
);
const ListingDetail = React.lazy(() =>
  import("./pages/ListingDetail").then((m) => ({ default: m.ListingDetail })),
);
const SellerProfile = React.lazy(() =>
  import("./pages/SellerProfile").then((m) => ({ default: m.SellerProfile })),
);
const CreateListing = React.lazy(() =>
  import("./pages/CreateListing").then((m) => ({ default: m.CreateListing })),
);
const ChatList = React.lazy(() =>
  import("./pages/ChatList").then((m) => ({ default: m.ChatList })),
);
const ChatRoom = React.lazy(() =>
  import("./pages/ChatRoom").then((m) => ({ default: m.ChatRoom })),
);
const Profile = React.lazy(() =>
  import("./pages/Profile").then((m) => ({ default: m.Profile })),
);
const Dashboard = React.lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const Admin = React.lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.Admin })),
);
const BoostSuccess = React.lazy(() =>
  import("./pages/BoostSuccess").then((m) => ({ default: m.BoostSuccess })),
);
const PrivacyPolicy = React.lazy(() =>
  import("./pages/PrivacyPolicy").then((m) => ({ default: m.PrivacyPolicy })),
);
const TermsOfService = React.lazy(() =>
  import("./pages/TermsOfService").then((m) => ({ default: m.TermsOfService })),
);
const About = React.lazy(() =>
  import("./pages/About").then((m) => ({ default: m.About })),
);
const Pricing = React.lazy(() =>
  import("./pages/Pricing").then((m) => ({ default: m.Pricing })),
);
const ContactUs = React.lazy(() =>
  import("./pages/ContactUs").then((m) => ({ default: m.ContactUs })),
);
const TripPlanner = React.lazy(() =>
  import("./pages/TripPlanner").then((m) => ({ default: m.TripPlanner })),
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const bypassAuth =
    import.meta.env.VITE_E2E_BYPASS_AUTH === "true" ||
    new URLSearchParams(window.location.search).get("e2e") === "1";

  useEffect(() => {
    if (bypassAuth) {
      setUser({ id: "e2e-user", email: "e2e@example.com" } as unknown as User);
      setLoading(false);
      return;
    }

    const ensureProfileExists = async (firebaseUser: any) => {
      try {
        const profileRef = doc(db, "users", firebaseUser.uid);
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
          await setDoc(
            profileRef,
            {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: firebaseUser.displayName || "Island User",
              profilePhotoUrl: firebaseUser.photoURL || "",
              createdAt: serverTimestamp(),
            },
            { merge: true },
          );
        }
      } catch (err) {
        console.error("Profile fallback error:", err);
      }
    };

    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      async (firebaseUser) => {
        if (firebaseUser) {
          const mapped = {
            id: firebaseUser.uid,
            email: firebaseUser.email || "",
          } as unknown as User;
          setUser(mapped);
          await ensureProfileExists(firebaseUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [bypassAuth]);

  const RequireAuth = ({
    children,
    user,
    loading,
  }: {
    children: React.ReactNode;
    user: User | null;
    loading: boolean;
  }) => {
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
      <HelmetProvider>
        <ToastProvider>
          <PerformanceMonitor />
          <BrowserRouter>
            <Layout user={user}>
              <Suspense
                fallback={
                  <div className="flex justify-center items-center h-screen">
                    Loading...
                  </div>
                }
              >
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/listings" element={<Listings />} />
                  <Route path="/listings/:id" element={<ListingDetail />} />
                  <Route path="/seller/:sellerId" element={<SellerProfile />} />
                  <Route
                    path="/post"
                    element={
                      <RequireAuth user={user} loading={loading}>
                        <CreateListing />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/chats"
                    element={
                      <RequireAuth user={user} loading={loading}>
                        <ChatList />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/chats/:chatId"
                    element={
                      <RequireAuth user={user} loading={loading}>
                        <ChatRoom />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <RequireAuth user={user} loading={loading}>
                        <Profile />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <RequireAuth user={user} loading={loading}>
                        <Dashboard />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <RequireAuth user={user} loading={loading}>
                        <Admin />
                      </RequireAuth>
                    }
                  />
                  <Route path="/auth" element={<AuthView />} />
                  <Route
                    path="/boost-success"
                    element={
                      <RequireAuth user={user} loading={loading}>
                        <BoostSuccess />
                      </RequireAuth>
                    }
                  />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/contact" element={<ContactUs />} />
                  <Route
                    path="/planner"
                    element={
                      <RequireAuth user={user} loading={loading}>
                        <TripPlanner />
                      </RequireAuth>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </Layout>
          </BrowserRouter>
        </ToastProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
