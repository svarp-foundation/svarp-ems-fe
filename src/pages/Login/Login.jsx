import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { isAdminUser } from '../../components/ProtectedRoute';
import {
  Eye,
  EyeOff,
  Shield,
  AlertTriangle,
  KeyRound,
  X,
  ArrowRight,
  Lock,
} from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSessionConflict, setIsSessionConflict] = useState(false);

  // Bypass session modal states
  const [showBypassModal, setShowBypassModal] = useState(false);
  const [bypassKey, setBypassKey] = useState('');
  const [showBypassKey, setShowBypassKey] = useState(false);
  const [isBypassing, setIsBypassing] = useState(false);
  const [bypassError, setBypassError] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname;

  const navigateToDestination = (loggedInUser) => {
    const isStaff = isAdminUser(loggedInUser);
    let destination;
    if (isStaff) {
      destination = from && from !== '/login' && from !== '/candidate' ? from : '/dashboard';
    } else {
      destination = from && from.startsWith('/arena') ? from : '/candidate';
    }
    navigate(destination, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSessionConflict(false);
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigateToDestination(result.data?.user);
      } else {
        if (result.status === 409) {
          setIsSessionConflict(true);
          setErrorMessage(
            'Active session detected on another device or window. Single-session enforcement requires logging out of the existing session first.'
          );
          setBypassKey('');
          setBypassError(null);
          setShowBypassModal(true);
        } else {
          setErrorMessage(result.error || 'Invalid credentials or login failure.');
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected connection error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBypassSubmit = async (e) => {
    e.preventDefault();
    if (!bypassKey.trim()) {
      setBypassError('Please enter the session bypass key.');
      return;
    }

    if (!password) {
      setBypassError('Password is required to authenticate.');
      return;
    }

    setBypassError(null);
    setIsBypassing(true);

    try {
      const result = await login(email, password, bypassKey.trim());
      if (result.success) {
        setShowBypassModal(false);
        navigateToDestination(result.data?.user);
      } else {
        if (result.status === 403) {
          setBypassError(
            result.error || 'Invalid session bypass key. Please verify the key with your exam administrator.'
          );
        } else if (result.status === 409) {
          setBypassError('Session conflict persists. Please check the bypass key.');
        } else {
          setBypassError(result.error || 'Authentication failed. Please verify credentials and key.');
        }
      }
    } catch (err) {
      setBypassError(err.message || 'An unexpected error occurred during session override.');
    } finally {
      setIsBypassing(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] md:bg-[#f1f5f9] flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden">
      {/* Background ambient light effects matching LMS */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full -mr-40 -mt-40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#1f3b45]/10 rounded-full -ml-40 -mb-40 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white shadow-xl border border-slate-200/80 rounded-2xl md:rounded-3xl overflow-hidden relative z-10">
        <div className="px-6 py-8 sm:px-8 sm:py-10">
          {/* Brand Logo & Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <img
                src="/company/svarp-logo.webp"
                alt="SVARP"
                className="h-9 w-auto object-contain"
                onError={(e) => {
                  if (e.currentTarget.src.includes('svarp-logo.webp')) {
                    e.currentTarget.src = '/svarp-logo.png';
                  }
                }}
              />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-[#1f3b45] tracking-tight leading-none">
                SVARP
              </span>
              <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase mt-1">
                EXAMINATION PORTAL
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
              <Shield size={12} className="text-emerald-600" />
              <span>Single Session Protected</span>
            </div>
          </div>

          <h2 className="text-sm font-bold text-slate-900 mb-5 text-center">
            Sign in to Assessment &amp; Evaluation Studio
          </h2>

          {errorMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs mb-4 flex flex-col gap-2.5 border ${
                isSessionConflict
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle
                  size={16}
                  className={`flex-shrink-0 mt-0.5 ${
                    isSessionConflict ? 'text-amber-600' : 'text-rose-600'
                  }`}
                />
                <div className="flex-1 font-medium leading-relaxed">
                  {errorMessage}
                </div>
              </div>

              {isSessionConflict && (
                <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-amber-700 font-medium">
                    Have an authorized bypass key?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setBypassError(null);
                      setShowBypassModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-semibold text-[11px] transition-all cursor-pointer shadow-2xs"
                  >
                    <KeyRound size={12} />
                    <span>Enter Bypass Key</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-0.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="candidate@svarp.org or admin@svarp.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#1f3b45] focus:ring-1 focus:ring-[#1f3b45] text-slate-800 placeholder-slate-400 font-medium transition-all text-xs shadow-2xs"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-0.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#1f3b45] focus:ring-1 focus:ring-[#1f3b45] text-slate-800 placeholder-slate-400 font-medium transition-all text-xs shadow-2xs pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#1f3b45] hover:bg-[#152930] active:scale-[0.99] text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Authenticate &amp; Enter Studio</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 font-medium">
              Powered by SVARP Central Identity Services
            </p>
          </div>
        </div>
      </div>

      {/* Session Bypass Modal */}
      {showBypassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div
            className="w-full max-w-md bg-white rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden relative"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-2xs">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Active Session Detected
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Single-Session Bypass Authorization
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBypassModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleBypassSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-xs text-amber-900 leading-relaxed">
                An active session is currently running for{' '}
                <strong className="font-semibold text-slate-900">{email}</strong>.
                Enter the authorized administrator bypass key to terminate the previous session and sign in on this device now.
              </div>

              {bypassError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2">
                  <AlertTriangle size={15} className="text-rose-600 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{bypassError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-0.5">
                  Session Bypass Key
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Lock size={15} />
                  </div>
                  <input
                    type={showBypassKey ? 'text' : 'password'}
                    placeholder="Enter bypass key..."
                    value={bypassKey}
                    onChange={(e) => setBypassKey(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#1f3b45] focus:ring-1 focus:ring-[#1f3b45] text-slate-800 placeholder-slate-400 font-medium transition-all text-xs shadow-2xs"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowBypassKey(!showBypassKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    aria-label={showBypassKey ? 'Hide key' : 'Show key'}
                  >
                    {showBypassKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 ml-0.5">
                  Matches the authorized <code>SESSION_BYPASS_KEY</code> configured in backend environment.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBypassModal(false)}
                  disabled={isBypassing}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBypassing || !bypassKey.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#1f3b45] hover:bg-[#152930] active:scale-[0.99] text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isBypassing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying &amp; Overriding...</span>
                    </>
                  ) : (
                    <>
                      <span>Revoke Old Session &amp; Login</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
