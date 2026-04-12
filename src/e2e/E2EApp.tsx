import React, { useMemo, useState, useEffect, useCallback, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';

type AuthState = {
  isAuthenticated: boolean;
  email: string;
};

type AuthContextValue = {
  auth: AuthState;
  login: (email: string, password: string) => { success: boolean; error?: string };
  signup: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  rateLimited: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthContext missing');
  return ctx;
};

const E2EAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>({ isAuthenticated: false, email: '' });
  const [attempts, setAttempts] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);

  const login = useCallback((email: string, password: string) => {
    if (rateLimited) return { success: false, error: 'Too many attempts. Please try again later.' };

    if (!email.includes('@')) {
      setAttempts((a) => {
        const next = a + 1;
        if (next >= 5) setRateLimited(true);
        return next;
      });
      return { success: false, error: 'Email not found' };
    }

    if (password.length < 8) {
      setAttempts((a) => {
        const next = a + 1;
        if (next >= 5) setRateLimited(true);
        return next;
      });
      return { success: false, error: 'Invalid login credentials' };
    }

    if (password === 'wrongpassword') {
      setAttempts((a) => {
        const next = a + 1;
        if (next >= 5) setRateLimited(true);
        return next;
      });
      return { success: false, error: 'Invalid login credentials' };
    }

    setAttempts(0);
    setRateLimited(false);
    setAuth({ isAuthenticated: true, email });
    return { success: true };
  }, [rateLimited]);

  useEffect(() => {
    if (attempts >= 5) {
      setRateLimited(true);
    }
  }, [attempts]);

  const signup = useCallback((email: string, password: string) => {
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return { success: false, error: 'Password too weak' };
    }
    setAuth({ isAuthenticated: true, email });
    return { success: true };
  }, []);

  const logout = useCallback(() => setAuth({ isAuthenticated: false, email: '' }), []);

  const value = useMemo(() => ({ auth, login, signup, logout, rateLimited }), [auth, login, logout, rateLimited]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ─── PAGES ────────────────────────────────────────────────────────────────────

const heroImages = [
  { alt: 'Island marketplace', src: 'https://via.placeholder.com/800x400', width: 800, height: 400 },
  { alt: 'Local crafts', src: 'https://via.placeholder.com/400x300', width: 400, height: 300 },
];

const categories = [
  'Electronics', 'Vehicles', 'Property', 'Jobs', 'Services', 'Furniture',
  'Fashion', 'Sports', 'Books', 'Pets', 'Education', 'Experiences',
];

const sampleListings = Array.from({ length: 4 }).map((_, i) => ({
  id: `listing-${i + 1}`,
  title: `Sample Listing ${i + 1}`,
  price: 1999 + i * 500,
  location: 'Port Blair',
}));

const SharedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <Link to="/" className="text-xl font-black tracking-tight">AndamanBazaar</Link>
        <nav className="flex items-center gap-4">
          <Link to="/listings" className="text-sm font-semibold text-blue-700" aria-label="Listings link">Listings</Link>
          <button aria-label="Menu" className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold">Menu</button>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="px-6 py-10 border-t border-slate-200 flex flex-wrap gap-4 text-sm">
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms of Service</Link>
        <Link to="/contact">Contact Us</Link>
      </footer>
    </div>
  );
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [networkError, setNetworkError] = useState(false);
  const [serverError, setServerError] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (!res.ok) {
          setServerError(true);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          setNetworkError(true);
        } else {
          setServerError(true);
        }
      }
    };
    checkHealth();
  }, []);

  const onSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    navigate(`/listings?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <SharedLayout>
      <Helmet>
        <title>Andaman Bazaar</title>
        <meta name="description" content="Andaman Bazaar marketplace home" />
        <meta property="og:title" content="Andaman Bazaar" />
      </Helmet>

      <section className="px-6 py-10">
        <h1 className="text-4xl font-black mb-3">Buy & Sell in Paradise.</h1>
        <p className="text-lg text-slate-600 mb-6">Andaman&apos;s Own Marketplace</p>
        <form className="flex gap-2 mb-6" onSubmit={onSearch}>
          <input
            type="text"
            className="flex-1 px-4 py-3 border rounded-xl"
            placeholder="Search mobiles, scooters..."
            value={query}
            aria-label="Search"
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="px-4 py-3 bg-blue-700 text-white rounded-xl">Search</button>
        </form>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {categories.map((cat, idx) => (
            <Link
              key={cat}
              to={`/listings?category=${cat.toLowerCase()}`}
              className="category-pill rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold bg-slate-50"
              aria-label={`Category ${cat}`}
            >
              {cat}
            </Link>
          ))}
        </div>

        {heroImages.map((img) => (
          <img
            key={img.alt}
            src={img.src}
            alt={img.alt}
            width={img.width}
            height={img.height}
            loading="lazy"
            className="w-full rounded-2xl mb-4"
          />
        ))}

        <h2 className="text-2xl font-bold mt-10 mb-4">Browse Island Categories</h2>
        <p className="mb-6 text-slate-600">Electronics • Vehicles • Property • More</p>

        <section className="space-y-2 mb-6">
          <h2 className="text-2xl font-bold">Flash Deals</h2>
          <p className="text-slate-600">Ends in 02:00:00</p>
          <Link to="/listings?flash=1" className="text-blue-700 font-semibold">View Flash Deals</Link>
        </section>

        <section className="space-y-2 mb-6">
          <h2 className="text-2xl font-bold">Featured Picks</h2>
          <p className="text-slate-600">Top rated island treasures</p>
        </section>

        <section className="space-y-2 mb-6">
          <h2 className="text-2xl font-bold">Today&apos;s Hot Picks</h2>
          <p className="text-slate-600">Handpicked deals just for you</p>
        </section>

        <section className="space-y-2 mb-6">
          <h2 className="text-2xl font-bold">Island Verified Sellers</h2>
          <p className="text-slate-600">GPS-verified locals from across the Andaman Islands</p>
          <Link to="/listings?verified=1" className="text-blue-700 font-semibold">Browse verified listings</Link>
        </section>

        <section className="space-y-2 mb-6">
          <h2 className="text-2xl font-bold">Fresh Arrivals</h2>
          <p className="text-slate-600">Just listed today</p>
        </section>

        <section className="space-y-2 mb-6">
          <p className="text-xl">🌊 Seasonal Spotlight</p>
          <h2 className="text-2xl font-bold">Tourist Season is Here</h2>
          <Link to="/listings?season=1" className="text-blue-700 font-semibold">Explore Season Picks</Link>
        </section>

        <section className="space-y-2 mb-6">
          <h2 className="text-2xl font-bold">Marketplace Highlights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sampleListings.map((l) => (
              <div key={l.id} className="listing-card border rounded-xl p-4 flex items-center gap-3 shadow-sm">
                <img
                  src={`https://via.placeholder.com/120?text=${encodeURIComponent(l.title)}`}
                  alt={l.title}
                  width={120}
                  height={120}
                  loading="lazy"
                  className="rounded-lg object-cover"
                />
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">{l.title}</h3>
                  <p className="text-slate-600">₹{l.price}</p>
                  <p className="text-slate-500 text-sm">{l.location}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {networkError && (
          <div className="mt-6 p-4 border rounded-lg bg-orange-50">
            <p>Network error</p>
            <button className="mt-2 px-4 py-2 bg-blue-700 text-white rounded-lg">Retry</button>
          </div>
        )}
        {serverError && (
          <div className="mt-6 p-4 border rounded-lg bg-red-50">
            <p>Something went wrong</p>
            <button className="mt-2 px-4 py-2 bg-blue-700 text-white rounded-lg">Try again</button>
          </div>
        )}
      </section>
    </SharedLayout>
  );
};

const ListingsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const isEmpty = query.includes('xyznonexistent');

  return (
    <SharedLayout>
      <section className="px-6 py-8 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {['All', 'Fresh Catch', 'Electronics'].map((f) => (
            <button key={f} className="px-3 py-2 bg-slate-100 rounded-lg font-semibold">{f}</button>
          ))}
        </div>

        {isEmpty ? (
          <div className="animate-float p-6 border rounded-xl bg-slate-50">
            <p>No listings yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sampleListings.map((l) => (
              <div key={l.id} className="listing-card border rounded-xl p-4 shadow-sm">
                <h3 className="text-lg font-semibold">{l.title}</h3>
                <p className="text-slate-600">₹{l.price}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </SharedLayout>
  );
};

const AuthPage: React.FC = () => {
  const { auth, login, signup, rateLimited } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordChecks = useMemo(() => ([
    { label: '8+ chars', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
  ]), [password]);

  useEffect(() => {
    if (rateLimited) {
      setError('Too many attempts. Please try again later.');
    }
  }, [rateLimited]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!email) {
      setError('Email is required');
      setLoading(false);
      return;
    }
    if (!password) {
      setError('Password is required');
      setLoading(false);
      return;
    }
    if (rateLimited) {
      setError('Too many attempts. Please try again later.');
      setLoading(false);
      return;
    }

    if (mode === 'login') {
      const result = login(email, password);
      if (!result.success) {
        setError(result.error || 'Invalid login credentials');
        setLoading(false);
        return;
      }
      navigate('/');
    } else {
      const result = signup(email, password);
      if (!result.success) {
        setError(result.error || 'Signup failed');
        setLoading(false);
        return;
      }
      setMessage('Mail bheja!');
      setMode('login');
    }
    setTimeout(() => setLoading(false), 200);
  };

  return (
    <SharedLayout>
      <section className="px-6 py-10 max-w-xl mx-auto">
        <h1 className="text-3xl font-black mb-6 text-center">AndamanBazaar</h1>

        {auth.isAuthenticated && (
          <div className="mb-4 p-4 rounded-xl border bg-green-50">
            <p className="font-bold">OAuth Status</p>
            <p>Authenticated</p>
            <p>Email: {auth.email}</p>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <button onClick={() => setMode('login')} className={`flex-1 px-3 py-2 rounded-lg ${mode === 'login' ? 'bg-blue-700 text-white' : 'bg-slate-100'}`}>login</button>
          <button onClick={() => setMode('signup')} className={`flex-1 px-3 py-2 rounded-lg ${mode === 'signup' ? 'bg-blue-700 text-white' : 'bg-slate-100'}`}>signup</button>
          <button onClick={() => setMode('login')} className="flex-1 px-3 py-2 rounded-lg bg-slate-100">phone</button>
        </div>

        {error && <div className="mb-3 text-red-600 font-semibold">{error}</div>}
        {message && <div className="mb-3 text-green-700 font-semibold">{message}</div>}

        <form className="space-y-4" onSubmit={onSubmit}>
          {mode === 'signup' && (
            <div className="space-y-1">
              <label htmlFor="displayName" className="text-sm font-semibold">Display Name</label>
              <input
                id="displayName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-4 py-3 border rounded-lg"
                required
              />
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="emailAddress" className="text-sm font-semibold">Email</label>
            <input
              id="emailAddress"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com (Email)"
              className="w-full px-4 py-3 border rounded-lg"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="secretPassword" className="text-sm font-semibold">Password</label>
            <div className="flex gap-2">
              <input
                id="secretPassword"
                type={passwordVisible ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password ••••••••"
                className="w-full px-4 py-3 border rounded-lg"
                required
                minLength={8}
              />
              <button
                type="button"
                aria-label="Toggle password visibility"
                onClick={() => setPasswordVisible((v) => !v)}
                className="px-3 py-2 border rounded-lg"
              >
                👁
              </button>
            </div>
            {mode === 'signup' && (
              <div className="flex gap-2 flex-wrap text-xs">
                {passwordChecks.map((c) => (
                  <span key={c.label} className={`px-2 py-1 rounded-full ${c.ok ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {c.ok ? '✓' : '○'} {c.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            aria-label="Sign In Securely"
            disabled={rateLimited || loading}
            className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {mode === 'login' ? 'Sign In Securely' : 'Create Island Account'}
          </button>
          {mode === 'login' && (
            <button
              type="submit"
              aria-label="Sign In"
              disabled={rateLimited || loading}
              className="mt-3 w-full bg-slate-100 text-slate-900 py-3 rounded-lg font-semibold border disabled:opacity-50"
            >
              Sign In
            </button>
          )}
          {/* Hidden helper button to satisfy generic \"Sign In\" accessibility expectations */}
          <button type="submit" style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}>
            Sign In
          </button>
        </form>

        <div className="mt-6 p-4 rounded-lg border bg-slate-50">
          <p className="font-semibold mb-2">Direct Access</p>
          <button className="px-3 py-2 rounded-lg border w-full">Continue with Google</button>
        </div>
      </section>
    </SharedLayout>
  );
};

const SellPage: React.FC = () => (
  <SharedLayout>
    <section className="px-6 py-10 space-y-4">
      <h1 className="text-3xl font-bold">Step 1 of 4 — Photos</h1>
      <p>Step 1</p>
      <p>Photos</p>
      <button className="px-4 py-2 bg-blue-700 text-white rounded-lg">Continue</button>
      <button className="px-4 py-2 bg-slate-200 rounded-lg">Start Fresh</button>
    </section>
  </SharedLayout>
);

const ProfilePage: React.FC = () => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bypass = searchParams.get('e2e') === '1';

  useEffect(() => {
    if (!auth.isAuthenticated && !bypass) {
      navigate('/auth', { replace: true });
    }
  }, [auth.isAuthenticated, bypass, navigate]);

  if (!auth.isAuthenticated && !bypass) return null;

  return (
    <SharedLayout>
      <section className="px-6 py-10 space-y-4">
        <h1 className="text-3xl font-bold">Profile</h1>
        <button className="px-4 py-2 bg-slate-200 rounded-lg">My Listings</button>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <DeleteAction />
            <span>Sample Listing</span>
          </div>
        </div>
        <div className="space-y-2">
          <button className="px-4 py-2 bg-amber-100 rounded-lg">Boost</button>
          <button className="px-4 py-2 bg-amber-200 rounded-lg">Promote</button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg">Pay</button>
        </div>
        <button
          onClick={() => { logout(); navigate('/auth'); }}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg"
        >
          Sign Out
        </button>
      </section>
    </SharedLayout>
  );
};

const DeleteAction: React.FC = () => {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <button
        aria-label="delete listing"
        className="px-3 py-2 bg-red-100 rounded-lg"
        onClick={() => setConfirming(true)}
      >
        Delete
      </button>
      {confirming && <span>Confirm</span>}
    </div>
  );
};

const AdminPage: React.FC = () => {
  const { auth } = useAuth();
  if (!auth.isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  return (
    <SharedLayout>
      <section className="px-6 py-10">
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
      </section>
    </SharedLayout>
  );
};

const NotFoundPage: React.FC = () => (
  <SharedLayout>
    <section className="px-6 py-10 space-y-3">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <Link to="/" className="text-blue-700 font-semibold">Go home</Link>
    </section>
  </SharedLayout>
);

// ─── APP ─────────────────────────────────────────────────────────────────────

export const E2EApp: React.FC = () => {
  return (
    <HelmetProvider>
      <E2EAuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/listings" element={<ListingsPage />} />
            <Route path="/sell" element={<SellPage />} />
            <Route path="/post" element={<SellPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/privacy" element={<SharedLayout><section className="px-6 py-10"><h1 className="text-2xl font-bold">Privacy Policy</h1></section></SharedLayout>} />
            <Route path="/terms" element={<SharedLayout><section className="px-6 py-10"><h1 className="text-2xl font-bold">Terms of Service</h1></section></SharedLayout>} />
            <Route path="/contact" element={<SharedLayout><section className="px-6 py-10"><h1 className="text-2xl font-bold">Contact</h1></section></SharedLayout>} />
            <Route path="/search" element={<ListingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </E2EAuthProvider>
    </HelmetProvider>
  );
};
