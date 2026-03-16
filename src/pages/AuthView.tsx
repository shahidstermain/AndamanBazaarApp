
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthProvider, isFirebaseAvailable, isAuthenticated, signIn, signUp, signInWithGoogle, onAuthStateChanged, UserProfile } from '../lib/auth';
import { COPY } from '../lib/localCopy';
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  RefreshCcw
} from 'lucide-react';



export const AuthView: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup' | 'phone' | 'verify'>('login');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);

  useEffect(() => {
    const authProvider = getAuthProvider();
    
    // Check if any auth provider is configured
    if (authProvider === 'firebase' && !isFirebaseAvailable()) {
      setError('Firebase Auth is not configured. Please set VITE_FIREBASE_* variables.');
      return;
    }
    if (!isFirebaseAvailable()) {
      setError('Firebase Auth is not configured. Please set VITE_FIREBASE_* environment variables.');
      return;
    }

    const checkSession = async () => {
      const isAuth = await isAuthenticated();
      if (isAuth) {
        navigate('/');
      }
    };

    checkSession();
    
    // Set up auth state listener
    const unsubscribe = onAuthStateChanged((user: UserProfile | null) => {
      if (user) {
        navigate('/');
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [navigate]);

  // S7: Password strength validation
  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(pwd)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(pwd)) errors.push('One lowercase letter');
    if (!/[0-9]/.test(pwd)) errors.push('One number');
    return errors;
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (mode === 'signup') {
      setPasswordErrors(validatePassword(val));
    }
  };

  const clearState = () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(false);
  };



  const handleResendEmail = async () => {
    setError('Email verification resend is handled through Firebase. Please check your inbox or contact support.');
  };

  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    clearState();
    setError('Phone authentication is not yet available. Please use email/password.');
  };

  const handleOAuthLogin = async (_provider: 'google') => {
    clearState();
    setLoading(true);
    try {
      console.log('Starting Google sign-in...');
      const result = await signInWithGoogle();
      console.log('Google sign-in result:', result);
      if (!result.success) {
        if (result.error === 'Sign-in was cancelled.') {
          // User closed the popup — no error needed
          return;
        }
        throw new Error(result.error || 'Google sign-in failed');
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    clearState();
    setLoading(true);

    try {
      if (mode === 'login') {
        const result = await signIn(email, password);
        if (!result.success) {
          const errorMsg = result.error || 'Login failed';
          if (errorMsg.includes("Email not confirmed")) {
            setEmailNotConfirmed(true);
          }
          throw new Error(errorMsg);
        }
      } else if (mode === 'signup') {
        const result = await signUp(email, password, fullName);
        if (!result.success) {
          throw new Error(result.error || 'Signup failed');
        }
        setSuccessMsg(`Account created! Welcome to AndamanBazaar.`);
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center px-4 bg-slate-50 py-12">
      <div className="w-full max-w-md bg-white rounded-[48px] shadow-2xl overflow-hidden border border-slate-100 ring-1 ring-black/5">
        <div className="bg-ocean-700 p-10 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full opacity-10 blur-3xl translate-x-12 -translate-y-12"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-coral-500 rounded-full opacity-20 blur-2xl -translate-x-8 translate-y-8"></div>
          <h2 className="text-4xl font-heading font-black tracking-tight relative z-10">AndamanBazaar</h2>
          <p className="mt-3 text-ocean-100 font-bold relative z-10 text-sm tracking-wide">{COPY.AUTH.SIGNUP_SUBTITLE}</p>
        </div>

        <div className="p-8 md:p-10">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-10">
            {['login', 'signup', 'phone'].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m as any); clearState(); }}
                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${mode === m || (mode === 'verify' && m === 'phone') ? 'bg-white shadow-lg text-ocean-700' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {m === 'phone' ? 'Phone' : m}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-8 p-5 bg-red-50 text-red-600 text-sm font-medium rounded-3xl border border-red-100 flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div className="leading-relaxed flex-1">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-8 p-5 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-3xl border border-emerald-100 flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
              <CheckCircle size={20} className="shrink-0 mt-0.5" />
              <p className="leading-relaxed">{successMsg}</p>
            </div>
          )}

          <form onSubmit={mode === 'phone' || mode === 'verify' ? handlePhoneAuth : handleEmailAuth} className="space-y-5">
            {mode === 'signup' && (
              <div className="space-y-2">
                <label htmlFor="displayName" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Display Name</label>
                <input id="displayName" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Rahul Sharma" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-ocean-500 focus:bg-white rounded-2xl outline-none font-bold transition-all" required />
              </div>
            )}
            {(mode === 'login' || mode === 'signup') && (
              <>
                <div className="space-y-2">
                  <label htmlFor="emailAddress" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input id="emailAddress" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@domain.com" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-ocean-500 focus:bg-white rounded-2xl outline-none font-bold transition-all" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="secretPassword" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secret Password</label>
                  <input id="secretPassword" type="password" value={password} onChange={e => handlePasswordChange(e.target.value)} placeholder="••••••••" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-ocean-500 focus:bg-white rounded-2xl outline-none font-bold transition-all" required minLength={8} />
                  {mode === 'signup' && password.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1 ml-1">
                      {['8+ chars', 'Uppercase', 'Lowercase', 'Number'].map((req, i) => {
                        const passed = [
                          password.length >= 8,
                          /[A-Z]/.test(password),
                          /[a-z]/.test(password),
                          /[0-9]/.test(password),
                        ][i];
                        return (
                          <span key={req} className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${passed ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                            {passed ? '✓' : '○'} {req}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
            {mode === 'phone' && (
              <div className="space-y-2">
                <label htmlFor="phoneNumber" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                <input id="phoneNumber" type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+91 99999 99999" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-ocean-500 focus:bg-white rounded-2xl outline-none font-bold transition-all" required />
              </div>
            )}
            {mode === 'verify' && (
              <div className="space-y-2">
                <label htmlFor="otpCode" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">OTP Code</label>
                <input id="otpCode" type="text" value={otpToken} onChange={e => setOtpToken(e.target.value)} placeholder="123456" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-ocean-500 focus:bg-white rounded-2xl outline-none font-bold transition-all" required />
              </div>
            )}
            <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98] disabled:opacity-50">
              {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} />{COPY.LOADING.AUTH}</span> :
                mode === 'login' ? 'Sign In Securely' :
                  mode === 'signup' ? 'Create Island Account' :
                    mode === 'phone' ? 'Get OTP' : 'Verify & Sign In'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-4 text-center">
              <button
                onClick={handleResendEmail}
                disabled={resending || !email || !emailNotConfirmed}
                className="text-[10px] font-black text-ocean-700 uppercase tracking-widest hover:underline disabled:opacity-30"
              >
                {resending ? 'Resending link...' : "Didn't receive verification email?"}
              </button>
            </div>
          )}

          <div className="mt-10">
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-slate-100"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-300"><span className="bg-white px-6 tracking-[0.3em]">Direct Access</span></div>
            </div>

            <button
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-4 py-5 border-2 border-slate-100 rounded-3xl hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-[0.98] disabled:opacity-50 group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
              </svg>
              <span className="font-black text-slate-700 text-xs uppercase tracking-widest">Continue with Google</span>
            </button>
          </div>



        </div>
      </div>
      <p className="mt-12 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Island Verified Technology &copy; {new Date().getFullYear()}</p>
    </div >
  );
};
