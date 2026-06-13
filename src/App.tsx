import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Send,
  Paperclip,
  PhoneOff,
  Trash2,
  Shield,
  Play,
  Square,
  User,
  Clock,
  Search,
  LogOut,
  CheckCircle,
  Download,
  ExternalLink,
  Calendar,
  Layers,
  FileText,
  Menu,
  X,
  AlertTriangle,
  History,
  Activity,
  Users,
  SwitchCamera
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

// Simple Hash Router & State Management
type PageRoute = 'login' | 'dashboard' | 'sessions' | 'session' | 'join' | 'history' | 'history-detail' | 'recordings' | 'admin';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface DBMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  createdAt: string;
}

interface DBParticipant {
  id: string;
  name: string;
  role: string;
  joinedAt: string;
}

interface DBSession {
  id: string;
  title: string | null;
  token: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED';
  agentId: string;
  customerName: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  agent?: { email: string };
  participants?: DBParticipant[];
  recordings?: any[];
}

interface EventLog {
  id: string;
  sessionId: string;
  type: string;
  detail: string;
  timestamp: string;
  session?: { title: string };
}

export default function App() {
  // Navigation & Page Router
  const [currentRoute, setCurrentRoute] = useState<PageRoute>('login');
  const [routeParams, setRouteParams] = useState<Record<string, string>>({});
  
  // Auth state
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('resolve_token'));
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(
    localStorage.getItem('resolve_user') ? JSON.parse(localStorage.getItem('resolve_user')!) : null
  );

  // Layout UI
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  // --- Parse URL Hash Router on Load/Change ---
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#/login';
      const parts = hash.split('/');
      const rootPage = parts[1] as PageRoute;

      if (rootPage) {
        // Authenticated check
        const publicPages: PageRoute[] = ['login', 'join', 'session'];
        const isPublic = publicPages.includes(rootPage);
        const hasToken = !!localStorage.getItem('resolve_token');

        if (!isPublic && !hasToken) {
          window.location.hash = '#/login';
          setCurrentRoute('login');
          return;
        }

        setCurrentRoute(rootPage);
        const params: Record<string, string> = {};
        if (parts[2]) {
          params.id = parts[2];
        }
        setRouteParams(params);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Trigger on mount

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [authToken]);

  // Alert dismiss auto timer
  useEffect(() => {
    if (globalError) {
      const t = setTimeout(() => setGlobalError(null), 6000);
      return () => clearTimeout(t);
    }
  }, [globalError]);

  useEffect(() => {
    if (globalSuccess) {
      const t = setTimeout(() => setGlobalSuccess(null), 6000);
      return () => clearTimeout(t);
    }
  }, [globalSuccess]);

  const triggerLogout = () => {
    localStorage.removeItem('resolve_token');
    localStorage.removeItem('resolve_user');
    setAuthToken(null);
    setCurrentUser(null);
    window.location.hash = '#/login';
    setGlobalSuccess('Logged out successfully.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-slate-200 selection:text-slate-900">
      {/* Alert Top-Bar */}
      {globalError && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-red-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center justify-between border border-red-500 animate-slide-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" id="error-alert-icon" />
            <p className="text-sm font-medium">{globalError}</p>
          </div>
          <button onClick={() => setGlobalError(null)} className="ml-4 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {globalSuccess && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-stone-900 text-white px-4 py-3 rounded-lg shadow-xl flex items-center justify-between border border-stone-800 animate-slide-in">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" id="success-alert-icon" />
            <p className="text-sm font-medium">{globalSuccess}</p>
          </div>
          <button onClick={() => setGlobalSuccess(null)} className="ml-4 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Clean Navigation */}
      {currentUser && (
        <header className="bg-stone-900 text-white sticky top-0 z-40 border-b border-stone-800 shadow-md">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              {/* Logo / Brand */}
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => { window.location.hash = '#/dashboard'; }}>
                <div className="bg-emerald-500 hover:bg-emerald-400 text-stone-900 p-2 rounded-lg font-bold flex items-center justify-center transition-colors shadow">
                  <Video className="w-5 h-5" id="nav-brand-logo" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">Resolve<span className="text-emerald-400">.</span></span>
              </div>

              {/* Desktop Navigation Link Tabs */}
              <nav className="hidden md:flex items-center gap-8">
                <a
                  href="#/dashboard"
                  className={`text-sm font-medium transition-colors hover:text-emerald-400 ${
                    currentRoute === 'dashboard' ? 'text-emerald-400' : 'text-slate-300'
                  }`}
                  id="nav-dashboard"
                >
                  Dashboard
                </a>
                <a
                  href="#/sessions"
                  className={`text-sm font-medium transition-colors hover:text-emerald-400 ${
                    currentRoute === 'sessions' ? 'text-emerald-400' : 'text-slate-300'
                  }`}
                  id="nav-sessions"
                >
                  Sessions
                </a>
                <a
                  href="#/history"
                  className={`text-sm font-medium transition-colors hover:text-emerald-400 ${
                    currentRoute === 'history' || currentRoute === 'history-detail' ? 'text-emerald-400' : 'text-slate-300'
                  }`}
                  id="nav-history"
                >
                  Histories
                </a>
                <a
                  href="#/recordings"
                  className={`text-sm font-medium transition-colors hover:text-emerald-400 ${
                    currentRoute === 'recordings' ? 'text-emerald-400' : 'text-slate-300'
                  }`}
                  id="nav-recordings"
                >
                  Recordings
                </a>
                <a
                  href="#/admin"
                  className={`text-sm font-medium transition-colors hover:text-emerald-400 ${
                    currentRoute === 'admin' ? 'text-emerald-400' : 'text-slate-300'
                  }`}
                  id="nav-admin"
                >
                  Audit Logs
                </a>
              </nav>

              {/* Right side Agent User Context */}
              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-2 text-slate-300 text-xs py-1.5 px-3 bg-stone-800 border border-stone-700 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="truncate max-w-[150px] font-medium text-slate-200">{currentUser.email}</span>
                  <span className="text-stone-500 font-bold">|</span>
                  <span className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase">{currentUser.role}</span>
                </div>
                <button
                  onClick={triggerLogout}
                  className="bg-stone-800 hover:bg-stone-700 text-slate-300 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all border border-stone-700 cursor-pointer"
                  id="btn-logout"
                >
                  <LogOut className="w-4 h-4 text-slate-400" />
                  Sign Out
                </button>
              </div>

              {/* Mobile Burger Toggle */}
              <div className="flex md:hidden">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-lg bg-stone-800 text-slate-300 hover:text-white hover:bg-stone-700 focus:outline-none transition-colors border border-stone-700"
                  id="btn-mobile-burger"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile OffCanvas Navigation Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-stone-800 bg-stone-900 py-3 px-4 flex flex-col gap-2.5 animate-fade-in shadow-inner">
              <a
                href="#/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 px-3 rounded-md text-sm font-semibold transition-all ${
                  currentRoute === 'dashboard' ? 'bg-stone-800 text-emerald-400 border-l-4 border-emerald-400' : 'text-slate-300 hover:bg-stone-800'
                }`}
              >
                Dashboard
              </a>
              <a
                href="#/sessions"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 px-3 rounded-md text-sm font-semibold transition-all ${
                  currentRoute === 'sessions' ? 'bg-stone-800 text-emerald-400 border-l-4 border-emerald-400' : 'text-slate-300 hover:bg-stone-800'
                }`}
              >
                Sessions
              </a>
              <a
                href="#/history"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 px-3 rounded-md text-sm font-semibold transition-all ${
                  currentRoute === 'history' || currentRoute === 'history-detail' ? 'bg-stone-800 text-emerald-400 border-l-4 border-emerald-400' : 'text-slate-300 hover:bg-stone-800'
                }`}
              >
                Histories
              </a>
              <a
                href="#/recordings"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 px-3 rounded-md text-sm font-semibold transition-all ${
                  currentRoute === 'recordings' ? 'bg-stone-800 text-emerald-400 border-l-4 border-emerald-400' : 'text-slate-300 hover:bg-stone-800'
                }`}
              >
                Recordings
              </a>
              <a
                href="#/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 px-3 rounded-md text-sm font-semibold transition-all ${
                  currentRoute === 'admin' ? 'bg-stone-800 text-emerald-400 border-l-4 border-emerald-400' : 'text-slate-300 hover:bg-stone-800'
                }`}
              >
                Audit Logs
              </a>
              <div className="border-t border-stone-800 pt-3 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400 font-medium">{currentUser.email}</span>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">{currentUser.role}</span>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    triggerLogout();
                  }}
                  className="bg-stone-800 text-slate-300 hover:bg-red-950 hover:text-red-400 border border-stone-700 hover:border-red-900 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </header>
      )}

      {/* Core Component Router Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-stretch">
        {currentRoute === 'login' && (
          <LoginPage setAuthToken={setAuthToken} setCurrentUser={setCurrentUser} setGlobalError={setGlobalError} setGlobalSuccess={setGlobalSuccess} />
        )}
        {currentRoute === 'dashboard' && (
          <DashboardPage setGlobalError={setGlobalError} setGlobalSuccess={setGlobalSuccess} />
        )}
        {currentRoute === 'sessions' && (
          <SessionsPage setGlobalError={setGlobalError} setGlobalSuccess={setGlobalSuccess} />
        )}
        {currentRoute === 'session' && (
          <SessionRoomPage sessionId={routeParams.id} setGlobalError={setGlobalError} setGlobalSuccess={setGlobalSuccess} />
        )}
        {currentRoute === 'join' && (
          <CustomerJoinPage inviteToken={routeParams.id} setGlobalError={setGlobalError} setGlobalSuccess={setGlobalSuccess} />
        )}
        {currentRoute === 'history' && (
          <HistoryPage />
        )}
        {currentRoute === 'history-detail' && (
          <HistoryDetailIdPage sessionId={routeParams.id} />
        )}
        {currentRoute === 'recordings' && (
          <RecordingsPage setGlobalError={setGlobalError} setGlobalSuccess={setGlobalSuccess} />
        )}
        {currentRoute === 'admin' && (
          <AdminLogsPage />
        )}
      </main>

      {/* Simple Footer */}
      <footer className="bg-stone-900 text-slate-400 border-t border-stone-800 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-semibold text-slate-300">Resolve Customer Support Call System — AtomQuest Hackathon</p>
          <div className="flex gap-4 items-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 bg-stone-800 py-1 px-3.5 rounded-full border border-stone-700">Self-Hosted Infrastructure</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ==========================================
// 1. PAGE: LOGIN
// ==========================================
function LoginPage({
  setAuthToken,
  setCurrentUser,
  setGlobalError,
  setGlobalSuccess,
}: {
  setAuthToken: (t: string | null) => void;
  setCurrentUser: (u: AuthUser | null) => void;
  setGlobalError: (err: string | null) => void;
  setGlobalSuccess: (sc: string | null) => void;
}) {
  const [email, setEmail] = useState('agent@resolve.com');
  const [password, setPassword] = useState('password123');
  const [submitting, setSubmitting] = useState(false);

  // Customer states
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('resolve_customer_name') || '');
  const [meetingInput, setMeetingInput] = useState('');
  const [customerSubmitting, setCustomerSubmitting] = useState(false);

  // Redirect if logged in
  useEffect(() => {
    if (localStorage.getItem('resolve_token')) {
      window.location.hash = '#/dashboard';
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setGlobalError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('resolve_token', data.token);
      localStorage.setItem('resolve_user', JSON.stringify(data.user));
      setAuthToken(data.token);
      setCurrentUser(data.user);
      
      setGlobalSuccess(`Welcome back, ${data.user.email}!`);
      window.location.hash = '#/dashboard';
    } catch (err: any) {
      setGlobalError(err.message || 'Connection error. Is the server running?');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomerJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !meetingInput.trim()) return;
    setCustomerSubmitting(true);
    setGlobalError(null);

    try {
      let tokenOrId = meetingInput.trim();

      // Parse token or ID from full meeting join link/pattern
      if (tokenOrId.includes('#/join/')) {
        const parts = tokenOrId.split('#/join/');
        tokenOrId = parts[1]?.split('/')?.[0] || tokenOrId;
      } else if (tokenOrId.includes('#/session/')) {
        const parts = tokenOrId.split('#/session/');
        tokenOrId = parts[1]?.split('/')?.[0] || tokenOrId;
      } else if (tokenOrId.includes('/join/')) {
        const parts = tokenOrId.split('/join/');
        tokenOrId = parts[1]?.split('/')?.[0] || tokenOrId;
      } else if (tokenOrId.includes('/session/')) {
        const parts = tokenOrId.split('/session/');
        tokenOrId = parts[1]?.split('/')?.[0] || tokenOrId;
      }

      // Store name in localStorage
      localStorage.setItem('resolve_customer_name', customerName.trim());

      // 1. Try checking as an invitation token
      const resToken = await fetch(`/api/join/${tokenOrId}`);
      if (resToken.ok) {
        const sessData = await resToken.json();
        setGlobalSuccess('Invitation recognized! Redirecting into support call...');
        window.location.hash = `#/session/${sessData.id}`;
        return;
      }

      // 2. Try checking as direct Session ID
      const resSession = await fetch(`/api/sessions/${tokenOrId}`);
      if (resSession.ok) {
        const sessData = await resSession.json();
        setGlobalSuccess('Support Session recognized! Redirecting into support call...');
        window.location.hash = `#/session/${sessData.id}`;
        return;
      }

      throw new Error('No active session found matching that Meeting Link or ID.');
    } catch (err: any) {
      setGlobalError(err.message || 'Could not join with those credentials.');
    } finally {
      setCustomerSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8" id="login-container">
        
        {/* Support Agent Card (Left) */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl flex flex-col justify-between" id="login-card">
          <div>
            {/* Brand Header */}
            <div className="text-center mb-8">
              <div className="mx-auto w-12 h-12 bg-stone-900 text-emerald-400 rounded-xl font-bold flex items-center justify-center shadow mb-3">
                <Video className="w-6 h-6 animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Agent Login</h1>
              <p className="text-sm text-slate-500 mt-1">Access Resolve Operations & Sessions</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. agent@resolve.com"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none bg-slate-50 text-slate-900 font-medium placeholder-slate-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-100 transition-all text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your agent password"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none bg-slate-50 text-slate-900 font-medium placeholder-slate-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-100 transition-all text-sm"
                  required
                />
              </div>

              <button
                id="btn-login-submit"
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md"
              >
                {submitting ? 'Authenticating...' : 'Sign In Now'}
              </button>
            </form>
          </div>

          <div className="mt-8 pt-5 border-t border-slate-100 text-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">AtomQuest Demo Accounts</span>
            <p className="text-xs text-slate-500 font-medium mt-3">
              Use email: <strong className="text-stone-900">agent@resolve.com</strong><br />
              Password: <strong className="text-stone-900">password123</strong>
            </p>
          </div>
        </div>

        {/* Customer Join Card (Right) */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl flex flex-col justify-between" id="customer-join-card">
          <div>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="mx-auto w-12 h-12 bg-emerald-500 text-stone-950 rounded-xl font-bold flex items-center justify-center shadow mb-3">
                <User className="w-6 h-6 animate-pulse text-stone-950" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Join as a Customer</h1>
              <p className="text-sm text-slate-500 mt-1">Enter call with your invitation link or ID</p>
            </div>

            <form onSubmit={handleCustomerJoin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="customer-name">Your Full Name</label>
                <input
                  id="customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rachel Green"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none bg-slate-50 text-slate-900 font-medium placeholder-slate-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-100 transition-all text-sm font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="meeting-link">Meeting Link or Meeting ID</label>
                <input
                  id="meeting-link"
                  type="text"
                  value={meetingInput}
                  onChange={(e) => setMeetingInput(e.target.value)}
                  placeholder="Paste URL or enter Token / Session ID"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none bg-slate-50 text-slate-900 font-medium placeholder-slate-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-100 transition-all text-sm font-semibold"
                  required
                />
              </div>

              <button
                id="btn-customer-join-submit"
                type="submit"
                disabled={customerSubmitting}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-stone-950 font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md"
              >
                {customerSubmitting ? 'Verifying Session...' : 'Join Support Call'}
              </button>
            </form>
          </div>

          <div className="mt-8 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
            <p className="font-semibold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full inline-block mb-3">No login required</p>
            <p className="leading-relaxed font-semibold">
              Customers can instantly connect with our support agents. Enter your display name and either the copied URL or session token.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

// ==========================================
// 2. PAGE: OPERATIONS DASHBOARD
// ==========================================
function DashboardPage({
  setGlobalError,
  setGlobalSuccess
}: {
  setGlobalError: (err: string | null) => void;
  setGlobalSuccess: (sc: string | null) => void;
}) {
  const [activeSessions, setActiveSessions] = useState<DBSession[]>([]);
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [endingId, setEndingId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('resolve_token')}` };
      
      const sRes = await fetch('/api/sessions/active', { headers });
      const activeData = await sRes.json();
      
      const lRes = await fetch('/api/admin/logs', { headers });
      const logData = await lRes.json();

      if (Array.isArray(activeData)) {
        setActiveSessions(activeData);
      }
      if (Array.isArray(logData)) {
        setLogs(logData.slice(0, 10)); // Take top 10 logs
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 8000); // Pool data every 8 seconds
    return () => clearInterval(interval);
  }, []);

  const forceEndSession = async (sessId: string) => {
    let confirmRes = true;
    try {
      if (typeof window !== 'undefined' && window.confirm) {
        confirmRes = window.confirm('Are you absolutely sure you want to FORCE end this support call? This will disconnect all active participants immediately.');
      }
    } catch (e) {
      confirmRes = true;
    }
    if (!confirmRes) return;

    setEndingId(sessId);
    try {
      const res = await fetch(`/api/sessions/${sessId}/end`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('resolve_token')}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to force end session');
      }

      setGlobalSuccess('The session has been terminated safely.');
      fetchDashboardData();
    } catch (err: any) {
      setGlobalError(err.message);
    } finally {
      setEndingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-stone-900 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm mt-4">Loading ops control center...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Operations Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Live call oversight, real-time metrics, & control center</p>
        </div>
        <div className="text-xs font-bold text-slate-400 tracking-widest bg-white py-2 px-4 rounded-full shadow-sm border border-slate-200 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          REAL-TIME LINK ACTIVE
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Calls</span>
            <p className="text-3xl font-black text-slate-900 mt-1">{activeSessions.filter(s => s.status === 'ACTIVE').length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending Invites</span>
            <p className="text-3xl font-black text-slate-900 mt-1">{activeSessions.filter(s => s.status === 'PENDING').length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">System Status</span>
            <p className="text-lg font-black text-slate-900 mt-1 flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              Healthy
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center font-bold">
            <Shield className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Active Calls and Event Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Active Session Console */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-stone-500" />
              Live Support Connections ({activeSessions.length})
            </h2>
            <button
              onClick={() => { window.location.hash = '#/sessions'; }}
              className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
            >
              <Play className="w-3.5 h-3.5" />
              Launch Session
            </button>
          </div>

          {activeSessions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center" id="empty-dashboard-state">
              <Video className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-800 font-bold text-base">No active support flows currently</p>
              <p className="text-slate-400 text-xs mt-1">Create an invite link in Sessions to connect with a customer.</p>
              <button
                onClick={() => { window.location.hash = '#/sessions'; }}
                className="mt-4 inline-flex items-center gap-1.5 px-4  py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition-all shadow"
              >
                Go to Sessions
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeSessions.map((session) => (
                <div key={session.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-all hover:border-slate-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-800">{session.title || 'Support Session'}</span>
                      <span className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full tracking-wider ${
                        session.status === 'ACTIVE' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium space-y-1">
                      <p>ID: <code className="text-stone-900 bg-slate-100 rounded-md py-0.5 px-1">{session.id}</code></p>
                      <p>Agent: <strong className="text-slate-700">{session.agent?.email}</strong></p>
                      {session.customerName && <p>Customer: <strong className="text-emerald-700">{session.customerName}</strong></p>}
                      <p className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Created {new Date(session.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <a
                      href={`#/session/${session.id}`}
                      className="flex-1 md:flex-none text-center bg-stone-100 hover:bg-stone-200 text-stone-900 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                    >
                      Connect
                    </a>
                    <button
                      disabled={endingId === session.id}
                      onClick={() => forceEndSession(session.id)}
                      className="flex-1 md:flex-none bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-600 px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <PhoneOff className="w-3.5 h-3.5" />
                      {endingId === session.id ? 'Ending...' : 'Terminate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live System Logging Stream */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-stone-500" />
            Audit Events Log
          </h2>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-hidden h-[400px] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-10 font-medium">Listening for system events...</p>
            ) : (
              <div className="relative border-l-2 border-slate-100 ml-2.5 pl-5 space-y-5">
                {logs.map((log) => (
                  <div key={log.id} className="text-xs relative">
                    <span className={`absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${
                      log.type.startsWith('RECORDING') ? 'bg-red-500' :
                      log.type === 'SESSION_ENDED' ? 'bg-stone-400' : 'bg-emerald-500'
                    }`}></span>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {log.type}
                      </span>
                      <p className="text-slate-700 font-medium mt-1 leading-relaxed">{log.detail}</p>
                      <p className="text-[10px] text-slate-400 font-medium tracking-tight">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ==========================================
// 3. PAGE: SESSION MANAGEMENT
// ==========================================
function SessionsPage({
  setGlobalError,
  setGlobalSuccess
}: {
  setGlobalError: (err: string | null) => void;
  setGlobalSuccess: (sc: string | null) => void;
}) {
  const [title, setTitle] = useState('');
  const [sessions, setSessions] = useState<DBSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Invite links modal/visual copy State
  const [activeInviteLink, setActiveInviteLink] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('resolve_token')}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setSessions(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('resolve_token')}`,
        },
        body: JSON.stringify({ title }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create session');
      }

      setGlobalSuccess(`Session "${data.title}" created successfully!`);
      setTitle('');
      fetchSessions();

      // Configure invite link string
      const hostUrl = window.location.origin + window.location.pathname;
      const completeLink = `${hostUrl}#/join/${data.token}`;
      setActiveInviteLink(completeLink);
    } catch (err: any) {
      setGlobalError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const copyLinkToClipboard = (link: string) => {
    navigator.clipboard.writeText(link);
    setGlobalSuccess('Copied invite link to clipboard!');
  };

  const forceEndSession = async (sessId: string) => {
    let confirmRes = true;
    try {
      if (typeof window !== 'undefined' && window.confirm) {
        confirmRes = window.confirm('Are you absolutely sure you want to end this customer support session cleanly?');
      }
    } catch (e) {
      confirmRes = true;
    }
    if (!confirmRes) return;

    try {
      const res = await fetch(`/api/sessions/${sessId}/end`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('resolve_token')}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to end session');
      }

      setGlobalSuccess('The session has been ended cleanly.');
      fetchSessions();
    } catch (err: any) {
      setGlobalError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-stone-900 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm mt-4">Loading sessions archive...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 animate-fade-in" id="sessions-page-view">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Support Sessions</h1>
        <p className="text-sm text-slate-500 mt-1">Spawn, dispatch and conduct customer support calls</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create Session Form */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Play className="w-5 h-5 text-stone-500" />
              Spawn Custom Support Call
            </h2>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="sessionTitle">Session Title / Ticket ID</label>
                <input
                  id="sessionTitle"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Ticket #4001 - Video Assist"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none bg-slate-50 text-slate-900 font-medium placeholder-slate-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-100 transition-all text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white font-bold rounded-lg transition-colors cursor-pointer text-sm shadow-md"
              >
                {creating ? 'Spawning...' : 'Create Support Invitation'}
              </button>
            </form>
          </div>

          {/* Active Invite Dialog box if present */}
          {activeInviteLink && (
            <div className="bg-stone-900 text-white p-6 rounded-2xl shadow-xl space-y-4 border border-stone-800 animate-slide-in">
              <div className="flex items-start justify-between">
                <h3 className="text-md font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  Invitation Active!
                </h3>
                <button onClick={() => setActiveInviteLink(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Copy and send this secure invite link directly to your customer. They can click and join the support session with no login required.
              </p>

              <div className="bg-stone-850 p-3 rounded-lg border border-stone-800 flex items-center justify-between gap-2 overflow-hidden">
                <code className="text-xs truncate font-mono text-slate-200 flex-1">{activeInviteLink}</code>
                <button
                  onClick={() => copyLinkToClipboard(activeInviteLink)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-stone-950 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm flex-shrink-0 cursor-pointer"
                >
                  Copy
                </button>
              </div>

              <div className="pt-3 border-t border-stone-800 flex justify-end">
                <button
                  onClick={() => {
                    const hashSegments = activeInviteLink.split('#');
                    window.location.hash = hashSegments[1];
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                >
                  Join Room Now
                  <ExternalLink className="w-3.5 h-3.5 font-bold" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* List of Sessions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-stone-500" />
            Session Audit Logs & Archive ({sessions.length})
          </h2>

          {sessions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <Video className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-800 font-bold text-base">No support history yet</p>
              <p className="text-slate-400 text-sm mt-1">Add a session using the creator form to begin video tracking.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((sess) => {
                const completeLink = `${window.location.origin}${window.location.pathname}#/join/${sess.token}`;
                return (
                  <div key={sess.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">{sess.title || 'Support Session'}</h3>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {sess.id}</p>
                      </div>
                      <span className={`self-start sm:self-center text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full tracking-wider ${
                        sess.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse' :
                        sess.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-stone-100 text-stone-600 border border-stone-200'
                      }`}>
                        {sess.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                      <div className="space-y-1">
                        <p>Agent: <span className="text-slate-800">{sess.agent?.email || 'N/A'}</span></p>
                        {sess.customerName && <p>Customer: <span className="text-emerald-700">{sess.customerName}</span></p>}
                        <p className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Created {new Date(sess.createdAt).toLocaleString()}
                        </p>
                      </div>

                      {sess.status !== 'COMPLETED' && (
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Invite URL</p>
                          <div className="bg-slate-50 p-2 rounded border border-slate-100 flex items-center justify-between gap-2">
                            <span className="text-slate-600 truncate max-w-[200px]">{completeLink}</span>
                            <button
                              onClick={() => copyLinkToClipboard(completeLink)}
                              className="bg-stone-900 hover:bg-stone-800 text-white py-1 px-3.5 rounded text-[10px] font-extrabold shadow-sm cursor-pointer"
                            >
                              Copy Link
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      {sess.status === 'COMPLETED' ? (
                        <>
                          <a
                            href={`#/history/${sess.id}`}
                            className="bg-slate-100 hover:bg-slate-200 text-stone-900 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Review Call Logs
                          </a>
                        </>
                      ) : (
                        <>
                          <a
                            href={`#/session/${sess.id}`}
                            className="bg-stone-900 hover:bg-stone-800 text-white py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Launch Room
                          </a>
                          <button
                            onClick={() => forceEndSession(sess.id)}
                            className="bg-red-50 hover:bg-red-100 border border-red-250 text-red-600 font-bold rounded-lg text-xs py-2 px-3.5 transition-all cursor-pointer"
                          >
                            Close Call
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ==========================================
// 4. PAGE: REAL-TIME SECURE VIDEO APPS
// ==========================================
function SessionRoomPage({
  sessionId,
  setGlobalError,
  setGlobalSuccess
}: {
  sessionId?: string;
  setGlobalError: (err: string | null) => void;
  setGlobalSuccess: (sc: string | null) => void;
}) {
  const [session, setSession] = useState<DBSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Participant Metadata Inputs
  const [userName, setUserName] = useState(() => localStorage.getItem('resolve_customer_name') || '');
  const [userRole, setUserRole] = useState<'AGENT' | 'CUSTOMER'>('CUSTOMER');
  const [joined, setJoined] = useState(false);

  // Call stream elements states
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [screenSharing, setScreenSharing] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerIntervalRef = useRef<any>(null);
  const [streamQuality, setStreamQuality] = useState<'EXCELLENT' | 'GOOD' | 'POOR'>('EXCELLENT');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [webrtcState, setWebrtcState] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');

  // Media Capture elements
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Sync ref with localStream changes
  const sessionRef = useRef<DBSession | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Keep local video element srcObject synchronized whenever localStream or layout state changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch((err) => {
        console.warn('Silent local video play action warning:', err);
      });
    }
  }, [localStream, cameraOn, screenSharing, joined]);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const [audioLevel, setAudioLevel] = useState(0); // 0-100 gauge

  // Real-time communications
  const socketRef = useRef<Socket | null>(null);
  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [participants, setParticipants] = useState<{ id: string; name: string; role: string }[]>([]);

  // File uploading configurations
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  // Synchronized confirmation timers to prevent instant hover resets
  useEffect(() => {
    if (confirmLeave) {
      const t = setTimeout(() => setConfirmLeave(false), 5000);
      return () => clearTimeout(t);
    }
  }, [confirmLeave]);

  useEffect(() => {
    if (confirmEnd) {
      const t = setTimeout(() => setConfirmEnd(false), 5000);
      return () => clearTimeout(t);
    }
  }, [confirmEnd]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Load basic session info on mount
  useEffect(() => {
    if (!sessionId) return;
    const fetchSessionInfo = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        const data = await res.json();
        if (res.ok) {
          setSession(data);
          // Set role dynamically if agent is logged in, else default to customer
          const token = localStorage.getItem('resolve_token');
          const savedUserRaw = localStorage.getItem('resolve_user');
          if (token && savedUserRaw) {
            const agentUser = JSON.parse(savedUserRaw);
            setUserName('Agent ' + agentUser.email.split('@')[0]);
            setUserRole('AGENT');
          } else {
            const cachedName = localStorage.getItem('resolve_customer_name') || '';
            if (cachedName) {
              setUserName(cachedName);
            }
            setUserRole('CUSTOMER');
          }
        } else {
          setGlobalError(data.error || 'Failed loading session details');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessionInfo();
  }, [sessionId]);

  // Clean-up Streams on Unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, []);

  // Trigger Local Media Capture
  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: true
      });

      setLocalStream(stream);
      localStreamRef.current = stream; // Keep ref in sync immediately

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Update WebRTC peer connection if active
      if (peerConnectionRef.current) {
        const videoTrack = stream.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
        
        const audioTrack = stream.getAudioTracks()[0];
        const audioSender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'audio');
        if (audioSender && audioTrack) {
          audioSender.replaceTrack(audioTrack);
        }
      }

      // Audio Monitoring analysis
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        
        audioContextRef.current = audioContext;
        audioAnalyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkAudioGauge = () => {
          if (!audioAnalyserRef.current) return;
          audioAnalyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avg = sum / bufferLength;
          setAudioLevel(Math.min(Math.round(avg * 1.5), 100)); // Amplify scale slightly
          requestAnimationFrame(checkAudioGauge);
        };
        requestAnimationFrame(checkAudioGauge);
      } catch (ae) {
        console.error('Audio meter analyzer failed to load:', ae);
      }
    } catch (err: any) {
      console.warn('Camera/mic access blocked or not available. Using visual simulator wrapper.', err);
    }
  };

  const toggleCamera = async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraOn(videoTrack.enabled);
      } else {
        await startCamera();
        setCameraOn(true);
      }
    } else {
      const oldState = cameraOn;
      if (!oldState) {
        await startCamera();
        setCameraOn(true);
      } else {
        setCameraOn(false);
      }
    }
  };

  const handleSwitchCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    await startCamera(newMode);
  };

  const toggleMic = async () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
      } else {
        await startCamera();
        setMicOn(true);
      }
    } else {
      const oldState = micOn;
      if (!oldState) {
        await startCamera();
        setMicOn(true);
      } else {
        setMicOn(false);
      }
    }
  };

  // ICE servers for WebRTC — STUN from Google + free TURN relays from OpenRelay
  const ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ];

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc-ice-candidate', { sessionId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('[WebRTC] Connection state:', state);
      if (state === 'connected') setWebrtcState('connected');
      else if (state === 'connecting' || state === 'new') setWebrtcState('connecting');
      else if (state === 'failed' || state === 'disconnected') setWebrtcState('failed');
    };

    return pc;
  };

  // Join the support call
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    setJoined(true);
    await startCamera();

    // Prepare socket
    const socket = io();
    socketRef.current = socket;

    socket.emit('join-room', {
      sessionId,
      name: userName,
      role: userRole,
    });

    // Populate current participant list locally
    setParticipants([{ id: `me-${Date.now()}`, name: userName, role: userRole }]);

    socket.on('participant-joined', async (part) => {
      setParticipants((prev) => {
        if (prev.find((p) => p.name === part.name)) return prev;
        return [...prev, part];
      });
      // System notification inside client messages
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sessionId: sessionId!,
          senderId: 'SYSTEM',
          senderName: 'System',
          senderRole: 'SYSTEM',
          text: `${part.name} (${part.role}) has joined the support session.`,
          createdAt: new Date().toISOString(),
        } as DBMessage,
      ]);

      // WebRTC: I was already in the room — create offer for the new joiner
      if (part.name !== userName && localStreamRef.current && !peerConnectionRef.current) {
        try {
          const pc = createPeerConnection();
          peerConnectionRef.current = pc;
          localStreamRef.current.getTracks().forEach((track) => {
            pc.addTrack(track, localStreamRef.current!);
          });
          setWebrtcState('connecting');
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
          await pc.setLocalDescription(offer);
          socket.emit('webrtc-offer', { sessionId, offer });
        } catch (err) {
          console.error('[WebRTC] Offer creation failed:', err);
        }
      }
    });

    socket.on('participant-left', (part) => {
      setParticipants((prev) => prev.filter((p) => p.name !== part.name));
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sessionId: sessionId!,
          senderId: 'SYSTEM',
          senderName: 'System',
          senderRole: 'SYSTEM',
          text: `${part.name} (${part.role}) has left the session.`,
          createdAt: new Date().toISOString(),
        } as DBMessage,
      ]);
    });

    socket.on('message-received', (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        const hasOptimistic = prev.some((m) => m.id.startsWith('local-') && m.text === msg.text && m.senderName === msg.senderName);
        if (hasOptimistic) {
          return prev.map((m) => (m.id.startsWith('local-') && m.text === msg.text && m.senderName === msg.senderName ? msg : m));
        }
        return [...prev, msg];
      });
    });

    socket.on('screen-share-updated', (share) => {
      if (share.userName !== userName) {
        setGlobalSuccess(`${share.userName} (${share.role}) started screen sharing.`);
      }
    });

    // Handle end session force shutdown cleanly
    socket.on('session-ended', () => {
      setGlobalError('The support session has been completed and ended. Disconnecting...');
      
      // Stop webcam and audio tracks immediately to shut down the recording/indicator lights
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      const videoEl = document.querySelector('video');
      if (videoEl && videoEl.srcObject) {
         try {
           (videoEl.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
         } catch (e) {}
      }

      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      setLocalStream(null);
      setScreenSharing(false);

      setTimeout(() => {
        // Safe access of session state and role
        const token = localStorage.getItem('resolve_token');
        const hasAgentToken = !!token;
        const savedSessionDoc = sessionRef.current;
        const targetHash = hasAgentToken ? '#/sessions' : (savedSessionDoc?.token ? `#/join/${savedSessionDoc.token}` : '#/login');
        window.location.hash = targetHash;
      }, 2500);
    });

    // --- WebRTC Signal Handlers ---
    socket.on('webrtc-offer', async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      try {
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
        const pc = createPeerConnection();
        peerConnectionRef.current = pc;
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => {
            pc.addTrack(track, localStreamRef.current!);
          });
        }
        setWebrtcState('connecting');
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc-answer', { sessionId, answer });
      } catch (err) {
        console.error('[WebRTC] Failed to handle offer:', err);
      }
    });

    socket.on('webrtc-answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error('[WebRTC] Failed to handle answer:', err);
      }
    });

    socket.on('webrtc-ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try {
        if (peerConnectionRef.current && candidate) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('[WebRTC] Failed to add ICE candidate:', err);
      }
    });

    // Refresh messages archive
    try {
      const mRes = await fetch(`/api/sessions/${sessionId}/messages`);
      const list = await mRes.json();
      if (Array.isArray(list)) {
        setMessages((prev) => {
          const combined = [...list];
          return combined;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;

    const textPayload = chatInput.trim();
    const localId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const optimisticMsg: DBMessage = {
      id: localId,
      sessionId: sessionId!,
      senderId: userRole === 'AGENT' ? 'AGENT' : 'CUSTOMER',
      senderName: userName,
      senderRole: userRole,
      text: textPayload,
      createdAt: new Date().toISOString()
    };

    // Append optimistically so it displays instantly on their UI
    setMessages((prev) => {
      if (prev.some((m) => m.id === optimisticMsg.id)) return prev;
      return [...prev, optimisticMsg];
    });

    socketRef.current.emit('send-message', {
      sessionId,
      text: textPayload,
      senderId: userRole === 'AGENT' ? 'AGENT' : 'CUSTOMER',
      senderName: userName,
      senderRole: userRole,
    });

    setChatInput('');
  };

  // Screen sharing toggle trigger
  const toggleScreenSharing = async () => {
    if (screenSharing) {
      setScreenSharing(false);
      socketRef.current?.emit('screen-share-status', {
        sessionId,
        sharing: false,
        userName,
        role: userRole,
      });

      // Restore camera
      await startCamera();
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        setScreenSharing(true);
        socketRef.current?.emit('screen-share-status', {
          sessionId,
          sharing: true,
          userName,
          role: userRole,
        });

        // Track stream ending
        stream.getVideoTracks()[0].onended = () => {
          setScreenSharing(false);
          startCamera();
        };
      } catch (err) {
        console.warn('Screen share cancelled or not supported inside iframe. Simulating desktop screen stream.');
        setScreenSharing(true);
      }
    }
  };

  // Support Recording
  const startRecording = async () => {
    try {
      let streamToRecord = localStream;
      if (!streamToRecord) {
        try {
          streamToRecord = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          setLocalStream(streamToRecord);
        } catch (mediaError) {
          console.warn("Could not initiate camera/audio for recording: ", mediaError);
        }
      }

      const headers: Record<string, string> = {};
      const token = localStorage.getItem('resolve_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Tell DB the recording has started
      const res = await fetch(`/api/sessions/${sessionId}/record/start`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        throw new Error('Failed to start recording on backend.');
      }

      const recData = await res.json();
      console.log('Recording started in database', recData);

      // Start recording locally
      recordingChunksRef.current = [];
      setRecordingSeconds(0);

      if (streamToRecord) {
        // Pick best supported codec — explicit bitrate caps to keep file sizes small
        const codecOptions = [
          { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 500_000, audioBitsPerSecond: 48_000 },
          { mimeType: 'video/webm;codecs=vp8,opus', videoBitsPerSecond: 500_000, audioBitsPerSecond: 48_000 },
          { mimeType: 'video/webm', videoBitsPerSecond: 500_000, audioBitsPerSecond: 48_000 },
          { mimeType: '' }, // browser default as last resort
        ];
        const options = codecOptions.find((o) => !o.mimeType || MediaRecorder.isTypeSupported(o.mimeType)) || {};

        const recorder = new MediaRecorder(streamToRecord, options);
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordingChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          if (recordingTimerIntervalRef.current) {
            clearInterval(recordingTimerIntervalRef.current);
            recordingTimerIntervalRef.current = null;
          }

          // Compile WebM blob
          const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
          console.log(`Generated final WebM recording blob: ${blob.size} bytes`);

          setGlobalSuccess('Completing browser recording... uploading video feed to cloud server.');

          // Upload final file to backend
          const formData = new FormData();
          formData.append('video', blob, `recording-${sessionId}-${Date.now()}.webm`);
          
          // Capture the seconds variable correctly from component state
          setRecordingSeconds((finalSecs) => {
            formData.append('durationSec', finalSecs.toString());
            return finalSecs;
          });

          try {
            const uploadRes = await fetch(`/api/sessions/${sessionId}/record/upload`, {
              method: 'POST',
              body: formData,
            });

            if (uploadRes.ok) {
              const uploadedRec = await uploadRes.json();
              setGlobalSuccess(`Call recording compiled and saved successfully as Ready! (Filename: ${uploadedRec.fileName})`);
            } else {
              const errData = await uploadRes.json();
              setGlobalError(errData.error || 'Failed uploading compiled recording to the backend.');
            }
          } catch (uploadErr) {
            console.error('Upload failed:', uploadErr);
            setGlobalError('Network failure uploading the browser-native recording file.');
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start(1000); // chunk every 1 second
      }

      setRecording(true);
      setGlobalSuccess('Live session call recording has successfully started.');

      // Start duration tracker timer
      recordingTimerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

    } catch (e: any) {
      console.error(e);
      setGlobalError(e.message || 'Error initializing browser-native recording.');
    }
  };

  const stopRecording = async () => {
    try {
      const headers: Record<string, string> = {};
      const token = localStorage.getItem('resolve_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Tell DB the recording has stopped
      await fetch(`/api/sessions/${sessionId}/record/stop`, {
        method: 'POST',
        headers,
      });

      // Stop local recorder. This triggers recorder.onstop() which handles compilation & upload
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      if (recordingTimerIntervalRef.current) {
        clearInterval(recordingTimerIntervalRef.current);
        recordingTimerIntervalRef.current = null;
      }

      setRecording(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Safe file attachments upload endpoint
  const triggerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('senderName', userName);
    formData.append('senderRole', userRole);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload error');
      }

      setGlobalSuccess(`Successfully shared file: ${file.name}`);

      // Instantly load fresh database messages so file displays without socket delay
      try {
        const mRes = await fetch(`/api/sessions/${sessionId}/messages`);
        const list = await mRes.json();
        if (Array.isArray(list)) {
          setMessages(list);
        }
      } catch (e) {
        console.warn('Could not auto-refresh chat list:', e);
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Error transmitting your secure attachment');
    } finally {
      setUploadProgress(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Hang-up and leave session cleanly for this individual client (leaves, but preserves session status)
  const handleLeaveCall = async () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setRemoteStream(null);
    setWebrtcState('idle');
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    setLocalStream(null);
    setScreenSharing(false);

    const token = localStorage.getItem('resolve_token');
    const hasAgentToken = !!token;
    const savedSessionDoc = sessionRef.current;
    const targetHash = hasAgentToken ? '#/sessions' : (savedSessionDoc?.token ? `#/join/${savedSessionDoc.token}` : '#/login');
    window.location.hash = targetHash;
  };

  // End support session call completely for ALL participants
  const handleEndSession = async () => {
    try {
      const token = localStorage.getItem('resolve_token');
      await fetch(`/api/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      setRemoteStream(null);
      setWebrtcState('idle');
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      setLocalStream(null);
      setScreenSharing(false);

      setGlobalSuccess('The session call was cleanly ended and terminated.');

      const hasAgentToken = !!token;
      const savedSessionDoc = sessionRef.current;
      const targetHash = hasAgentToken ? '#/sessions' : (savedSessionDoc?.token ? `#/join/${savedSessionDoc.token}` : '#/login');
      window.location.hash = targetHash;
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to end support session call.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-stone-900 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm mt-4">Connecting to media gateway...</p>
      </div>
    );
  }

  // Pre-join landing lobby setup
  if (!joined) {
    return (
      <div className="flex-1 flex items-center justify-center py-12 animate-fade-in" id="prejoin-lobby">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full space-y-6">
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-150">Resolve Support Room Lobby</span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-3">Ready to Join call?</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Configure your microphone and camera before connecting</p>
          </div>

          {session && (
            <div className="bg-slate-50 py-3 px-4 rounded-xl border border-slate-150 text-xs font-semibold text-slate-600 flex justify-between items-center">
              <span>Support ticket: <strong>{session.title || 'General Call'}</strong></span>
              <span className="text-stone-500 bg-slate-200 rounded py-0.5 px-1.5 font-mono">{session.status}</span>
            </div>
          )}

          {/* Lobby Preview box */}
          <div className="bg-stone-900 rounded-xl aspect-video relative overflow-hidden flex items-center justify-center text-white border border-stone-800 shadow shadow-inner">
            <div className="text-center space-y-2 z-10 p-4">
              <User className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-300 font-medium font-mono">Webcam Stream Suspended until Joining</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3 justify-between">
              <span className="text-xs font-bold text-slate-200 tracking-wider">Device Test Stage</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Devices Ready</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="lobbyName">Display Name</label>
              <input
                id="lobbyName"
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Type your name to enter support call..."
                className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none bg-slate-50 text-slate-900 font-semibold placeholder-slate-400 focus:border-stone-900 focus:ring-2 focus:ring-slate-150 transition-all text-sm"
              />
            </div>

            <button
              id="btn-join-room-submit"
              type="submit"
              className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-lg transition-all text-sm shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Video className="w-4 h-4" />
              Enter Support Session Call Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 animate-fade-in relative min-h-[600px] leading-none select-none">
      
      {/* 4A. Left: Video Calling grid & bottom Control Panel */}
      <div className="flex-1 flex flex-col gap-4">
        
        {/* Call Room top indicators */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-slate-900 truncate">
              {session?.title || 'Active Call'}
            </h2>
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-150 tracking-wider">
              LIVE
            </span>
            {recording && (
              <div className="flex items-center gap-1.5">
                <span className="bg-red-50 text-red-600 text-[10px] font-black px-2.5 py-1 rounded-full border border-red-150 tracking-wider animate-pulse flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping"></span>
                  RECORDING
                </span>
                <span className="bg-slate-100 text-slate-700 text-[10.5px] font-mono font-black px-2.5 py-1 rounded-full border border-slate-200 shadow-sm flex items-center gap-1" id="rec-timer">
                  ⏱️ {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{Math.floor(recordingSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1">
              Signal Quality: 
              <strong className="text-emerald-500 uppercase font-black">{streamQuality}</strong>
            </span>
            <span className="flex items-center gap-1">
              Active Users: 
              <strong className="text-slate-800">{participants.length}</strong>
            </span>
          </div>
        </div>

        {/* Video Canvas / Grid Area */}
        <div className="flex-1 bg-stone-950 border border-stone-850 rounded-2xl relative overflow-hidden flex flex-col min-h-[500px] lg:min-h-[380px] justify-stretch">
          
          {/* Main stream box - Screen Share Mode vs Grid view */}
          <div className="flex-1 relative flex items-center justify-center">
            {screenSharing ? (
              <div className="absolute inset-0 bg-stone-900 flex items-center justify-center text-white">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ transform: 'none' }}
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-4 left-4 bg-stone-950/80 backdrop-blur text-xs px-3 py-1.5 rounded-lg border border-stone-800">
                  🖥️ Presenting Desktop Screen Share
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 bg-stone-950 overflow-hidden">
                {/* Remote Participant — Main Background Stream */}
                <div className="absolute inset-0 flex items-center justify-center z-0">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={`w-full h-full object-cover ${remoteStream ? 'block' : 'hidden'}`}
                  />
                  {!remoteStream && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-4 bg-stone-900">
                      {participants.length < 2 ? (
                        <>
                          <div className="w-6 h-6 border-2 border-slate-500 border-t-white rounded-full animate-spin mx-auto"></div>
                          <p className="text-sm font-semibold text-slate-300">Waiting for other participant to join...</p>
                          <p className="text-xs text-slate-500 font-medium">Invitation links can be shared at any time.</p>
                        </>
                      ) : (
                        <>
                          <div className="w-24 h-24 bg-emerald-500/10 rounded-full border border-emerald-500/35 flex items-center justify-center">
                            <User className="w-12 h-12 text-emerald-400" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-slate-200 font-bold text-lg">
                              {participants.find((p) => p.name !== userName)?.name || 'Participant'}
                            </p>
                            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                              {participants.find((p) => p.name !== userName)?.role || 'CUSTOMER'}
                            </p>
                          </div>
                          <div className={`flex items-center gap-2 text-[10px] font-bold py-1.5 px-4 border rounded-full ${
                            webrtcState === 'connected' ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20' :
                            webrtcState === 'failed' ? 'text-red-400 bg-red-500/5 border-red-500/20 animate-pulse' :
                            'text-amber-400 bg-amber-500/5 border-amber-500/20 animate-pulse'
                          }`}>
                            <span className="w-2 h-2 rounded-full bg-current"></span>
                            {webrtcState === 'connected' ? 'VIDEO ACTIVE' :
                             webrtcState === 'failed' ? 'CONNECTION FAILED — RETRY' :
                             webrtcState === 'connecting' ? 'ESTABLISHING VIDEO...' : 'WAITING FOR VIDEO...'}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {/* Remote Participant Label */}
                  <div className="absolute bottom-4 left-4 bg-stone-950/80 backdrop-blur-sm text-xs font-bold text-slate-200 py-1.5 px-3 rounded-lg border border-stone-800 flex items-center gap-2 z-10">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{participants.find((p) => p.name !== userName)?.name || 'Remote Participant'}</span>
                    <span className="bg-stone-800 text-slate-400 px-1.5 py-0.5 rounded font-black uppercase text-[9px] tracking-wider">
                      {participants.find((p) => p.name !== userName)?.role || 'CUSTOMER'}
                    </span>
                  </div>
                </div>

                {/* Local Participant (Me) — Floating PiP in bottom right */}
                <div className="absolute bottom-4 right-4 w-28 h-40 sm:w-44 sm:h-60 bg-stone-900 border border-stone-700/60 rounded-xl overflow-hidden shadow-2xl z-20 flex items-center justify-center transition-all hover:scale-105 group">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover scale-x-[-1] ${cameraOn ? 'block' : 'hidden'}`}
                  />
                  {!cameraOn && (
                    <div className="absolute inset-0 bg-stone-900 flex flex-col items-center justify-center text-slate-500 text-center space-y-1 pointer-events-none z-10">
                      <VideoOff className="w-6 h-6 sm:w-8 sm:h-8 mx-auto" />
                    </div>
                  )}

                  {/* Local Label */}
                  <div className="absolute bottom-2 left-2 bg-stone-950/80 backdrop-blur-sm text-[8px] sm:text-[9px] font-bold text-slate-200 py-0.5 px-1.5 rounded-md border border-stone-800 flex items-center gap-1 z-10 opacity-70 group-hover:opacity-100 transition-opacity">
                    <span>{userName} (me)</span>
                  </div>

                  {/* Audio visualization meter bar - PiP version */}
                  <div className="absolute top-2 right-2 bg-stone-950/85 py-0.5 px-1 rounded border border-stone-800 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <div className="w-1 h-2 sm:h-3 bg-stone-700 rounded-sm relative overflow-hidden">
                      <div className="absolute bottom-0 left-0 right-0 bg-emerald-400 transition-all duration-75" style={{ height: `${audioLevel}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Audio/Video Call Control Panel */}
          <div className="bg-stone-900 border-t border-stone-850 p-4 flex flex-wrap items-center justify-center sm:justify-between gap-4 rounded-b-2xl min-h-[72px] text-white select-none">
            
            {/* Audio Toggle / Video Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMic}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  micOn ? 'bg-stone-850 hover:bg-stone-800 text-emerald-400 border border-stone-800' : 'bg-red-800/10 border border-red-900 text-red-500 hover:bg-red-800/20'
                }`}
                id="btn-toggle-mic"
                title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleCamera}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  cameraOn ? 'bg-stone-850 hover:bg-stone-800 text-emerald-400 border border-stone-800' : 'bg-red-800/10 border border-red-900 text-red-500 hover:bg-red-800/20'
                }`}
                id="btn-toggle-video"
                title={cameraOn ? 'Turn Video Off' : 'Turn Video On'}
              >
                {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              <button
                onClick={handleSwitchCamera}
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-all bg-stone-850 hover:bg-stone-800 text-slate-300 border border-stone-800"
                id="btn-switch-camera"
                title="Switch Camera (Front/Back)"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>

              <button
                onClick={toggleScreenSharing}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  screenSharing ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold' : 'bg-stone-850 hover:bg-stone-800 text-slate-300 border border-stone-800'
                }`}
                id="btn-share-screen"
                title="Share Screen"
              >
                <Monitor className="w-5 h-5" />
              </button>
            </div>

            {/* Rec control box - AGENT role only */}
            {userRole === 'AGENT' && (
              <div className="flex items-center gap-2">
                {recording ? (
                  <button
                    onClick={stopRecording}
                    className="bg-red-650 hover:bg-red-600 px-4 py-2 rounded-lg text-xs font-black shadow flex items-center gap-1.5 border border-red-750 cursor-pointer text-white"
                    id="btn-stop-recording"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    Stop Recording
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    className="bg-stone-850 hover:bg-stone-800 text-slate-300 border border-stone-800 px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    id="btn-start-recording"
                  >
                    <Play className="w-4 h-4 fill-slate-300 text-transparent" />
                    Record Call
                  </button>
                )}
              </div>
            )}

            {/* Leave or End Call actions */}
            <div className="flex items-center gap-2.5">
              {confirmLeave ? (
                <button
                  onClick={handleLeaveCall}
                  className="bg-amber-600 hover:bg-amber-550 font-bold text-white px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer text-white animate-pulse"
                  id="btn-leave-call-confirm"
                  title="Click again to leave"
                >
                  <CheckCircle className="w-4 h-4 text-white" />
                  Leave? (Click again)
                </button>
              ) : (
                <button
                  onClick={() => { setConfirmLeave(true); setConfirmEnd(false); }}
                  className="bg-slate-700 hover:bg-slate-650 font-bold text-white px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer text-white"
                  id="btn-leave-call"
                  title="Leave session"
                >
                  <LogOut className="w-4 h-4" />
                  Leave Call
                </button>
              )}

              {userRole === 'AGENT' && (
                confirmEnd ? (
                  <button
                    onClick={handleEndSession}
                    className="bg-red-700 hover:bg-red-650 font-bold text-white px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer text-white animate-pulse"
                    id="btn-end-call-confirm"
                    title="Click again to end call for everyone"
                  >
                    <AlertTriangle className="w-4 h-4 text-white" />
                    End Call? (Click again)
                  </button>
                ) : (
                  <button
                    onClick={() => { setConfirmEnd(true); setConfirmLeave(false); }}
                    className="bg-red-650 hover:bg-red-600 font-bold text-white px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer text-white border border-red-750"
                    id="btn-end-call"
                    title="Permanently End Call"
                  >
                    <PhoneOff className="w-4 h-4" />
                    End Call
                  </button>
                )
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 4B. Right: Chat Feed and File Exchanger Sidebar Panel */}
      <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-2xl flex flex-col max-h-[580px] lg:max-h-none overflow-hidden shadow-sm">
        
        {/* Sidebar Header tabs */}
        <div className="bg-slate-50 border-b border-slate-150 p-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span className="text-xs font-bold text-slate-800 tracking-tight uppercase">Session Messenger</span>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadProgress}
            className="text-xs font-bold text-slate-500 hover:text-stone-950 transition-colors flex items-center gap-1"
            title="Share document or image"
          >
            <Paperclip className="w-3.5 h-3.5" />
            Share Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={triggerFileUpload}
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt"
          />
        </div>

        {/* Chat Scrolling Area */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[250px] bg-slate-50/20">
          {messages.length === 0 ? (
            <div className="text-center py-16 px-4">
              <p className="text-slate-400 text-xs font-bold">No chat logs recorded yet.</p>
              <p className="text-[10px] text-slate-400/80 font-medium mt-1 leading-normal max-w-[180px] mx-auto">Messages are persisted securely in database.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg) => {
                const isMe = msg.senderName === userName;
                const isSys = msg.senderRole === 'SYSTEM';

                if (isSys) {
                  // Attempt parsing file upload system content
                  try {
                    const parsedFile = JSON.parse(msg.text);
                    const sharedBy = parsedFile.senderName ? `${parsedFile.senderName} (${parsedFile.senderRole || 'User'})` : 'Support Member';
                    return (
                      <div key={msg.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2 text-slate-700 max-w-[90%] self-center shadow-xs my-1">
                        <div className="flex items-center gap-1.5 font-bold text-stone-700">
                          <Paperclip className="w-3.5 h-3.5 text-stone-600" />
                          File Shared
                        </div>
                        <p className="font-semibold break-all text-slate-900">{parsedFile.fileName}</p>
                        <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400 font-semibold">
                          <span className="uppercase tracking-wider">Size: {Math.round(parsedFile.fileSize / 1024)} KB</span>
                          <span className="italic font-normal text-slate-500">By: {sharedBy}</span>
                        </div>
                        <a
                          href={parsedFile.fileUrl}
                          download={parsedFile.fileName}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-stone-900 hover:bg-stone-850 text-white font-bold py-1 px-3 rounded shadow text-[10px] transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Get File
                        </a>
                      </div>
                    );
                  } catch (e) {
                    return (
                      <div key={msg.id} className="text-center py-1 px-3 bg-slate-100 rounded-full border border-slate-200/50 text-[10px] text-slate-500 font-bold self-center max-w-[95%] my-1">
                        <span>{msg.text}</span>
                      </div>
                    );
                  }
                }

                return (
                  <div key={msg.id} className={`flex flex-col max-w-[85%] ${isMe ? 'items-end ml-auto' : 'items-start mr-auto'}`}>
                    <div className="flex items-center gap-1.5 mb-1 text-[9px] font-bold text-slate-400 px-1">
                      <span className={isMe ? 'text-stone-700' : 'text-slate-500'}>{msg.senderName}</span>
                      <span className="text-[7px] text-slate-300 font-bold">•</span>
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className={`py-2 px-3.5 rounded-2xl text-xs font-semibold break-words leading-relaxed shadow-xs ${
                      isMe ? 'bg-stone-900 text-stone-100 rounded-tr-none' : 'bg-slate-100 text-slate-900 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Upload Spinner Alert banner */}
        {uploadProgress && (
          <div className="bg-emerald-500 text-stone-950 font-extrabold text-[10px] py-2 px-4 leading-normal text-center animate-pulse flex items-center justify-center gap-1.5 flex-shrink-0 tracking-wider">
            <span className="w-3 h-3 border border-stone-950 border-t-white rounded-full animate-spin"></span>
            TRANSMITTING SECURE ATTACHMENT...
          </div>
        )}

        {/* Chat input controller */}
        <form onSubmit={handleSendMessage} className="bg-slate-50 border-t border-slate-150 p-4 flex gap-2 flex-shrink-0">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a support chat message..."
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 outline-none bg-white text-slate-900 font-medium placeholder-slate-400 focus:border-stone-950 text-xs"
          />
          <button
            id="btn-send-chat"
            type="submit"
            className="bg-stone-900 hover:bg-stone-850 p-2 text-white rounded-lg transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>

    </div>
  );
}

// ==========================================
// 5. PAGE: CUSTOMER INVITE JOIN GATEWAY
// ==========================================
function CustomerJoinPage({
  inviteToken,
  setGlobalError,
  setGlobalSuccess
}: {
  inviteToken?: string;
  setGlobalError: (err: string | null) => void;
  setGlobalSuccess: (sc: string | null) => void;
}) {
  const [userName, setUserName] = useState(() => localStorage.getItem('resolve_customer_name') || '');
  const [session, setSession] = useState<any | null>(null);
  const [processing, setProcessing] = useState(true);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    const verifyToken = async () => {
      try {
        const res = await fetch(`/api/join/${inviteToken}`);
        const data = await res.json();
        if (res.ok) {
          setSession(data);
          setResolved(true);

          // Direct entry: if they have their name cached, go straight to the room
          const storedName = localStorage.getItem('resolve_customer_name');
          if (storedName && storedName.trim() !== '') {
            setGlobalSuccess('Recognized! Directly entering live video session...');
            window.location.hash = `#/session/${data.id}`;
          }
        } else {
          setGlobalError(data.error || 'This invitation has invalid token credentials.');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setProcessing(false);
      }
    };
    verifyToken();
  }, [inviteToken]);

  const handleLaunchSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !session) return;

    localStorage.setItem('resolve_customer_name', userName.trim());
    setGlobalSuccess('Connecting you to live room calling!');
    // Redirect directly to call room
    window.location.hash = `#/session/${session.id}`;
  };

  if (processing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-slate-250 border-t-stone-900 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm mt-4">Verifying invitation credentials...</p>
      </div>
    );
  }

  if (!resolved || !session) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl max-w-md w-full text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">Invitation Invalid or Ended</h1>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            The secure invite link you clicked has expired, been cancelled, or the corresponding customer session was completed.
          </p>
          <button
            onClick={() => { window.location.hash = '#/login'; }}
            className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-lg text-xs"
          >
            Access Login Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center py-12">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl max-w-md w-full space-y-6 animate-fade-in" id="join-invite-box">
        
        {/* Header */}
        <div className="text-center">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#10b981] bg-emerald-50 border border-emerald-150 px-3.5 py-1 rounded-full">Secure Live Stream Greeting</span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-3">Join Video Support</h1>
          <p className="text-xs text-slate-500 leading-normal font-semibold mt-1">
            Resolve support engineer <strong className="text-slate-800">{session.agent?.email}</strong> has invited you to enter a secure call.
          </p>
        </div>

        {/* Ticket review card */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-1">
          <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">SESSION TARGET</span>
          <p className="text-sm font-bold text-slate-900">{session.title || 'Support Call'}</p>
          <div className="pt-2 border-t border-slate-150 flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span>Room ID: <code className="bg-slate-200 text-slate-700 py-0.5 px-1 rounded">{session.id.substring(0, 8)}...</code></span>
            <span>Status: <strong className="text-[#10b981]">{session.status}</strong></span>
          </div>
        </div>

        <form onSubmit={handleLaunchSession} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="joinName">Enter Your Name</label>
            <input
              id="joinName"
              type="text"
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. Rachel Green"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none bg-slate-50 text-slate-900 font-semibold placeholder-slate-400 focus:border-stone-950 focus:ring-2 focus:ring-slate-150 transition-all text-sm"
            />
          </div>

          <button
            id="btn-customer-join-room"
            type="submit"
            className="w-full py-3.5 bg-stone-900 hover:bg-stone-850 text-white font-bold rounded-lg text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Video className="w-5 h-5 flex-shrink-0" />
            Connect Now
          </button>
        </form>

        <p className="text-[10px] text-slate-400 text-center leading-relaxed font-semibold">
          No installation required. Video streams are operated strictly on secure browser native WebRTC media engines.
        </p>
      </div>
    </div>
  );
}

// ==========================================
// 6. PAGE: SEARCHABLE SESSION HISTORY LISTS
// ==========================================
function HistoryPage() {
  const [history, setHistory] = useState<DBSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/sessions', {
          headers: { Authorization: `Bearer ${localStorage.getItem('resolve_token')}` },
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setHistory(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filteredHistory = history.filter((sess) => {
    const term = searchTerm.toLowerCase();
    return (
      (sess.title && sess.title.toLowerCase().includes(term)) ||
      sess.id.toLowerCase().includes(term) ||
      (sess.customerName && sess.customerName.toLowerCase().includes(term)) ||
      (sess.agent?.email && sess.agent?.email.toLowerCase().includes(term))
    );
  });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-stone-900 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm mt-4">Loading operational histories...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 animate-fade-in" id="history-logs-page-view">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Audit Session Histories</h1>
        <p className="text-sm text-slate-500 mt-1">Audit chat history transcripts, participants and asset transfers</p>
      </div>

      {/* Search Input bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 max-w-md">
        <Search className="w-5 h-5 text-slate-400" id="search-history-icon" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by ticket, name, agent or ID..."
          className="flex-1 outline-none text-slate-900 bg-transparent text-sm font-semibold"
        />
      </div>

      {/* Grid List */}
      {filteredHistory.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center" id="empty-history-results">
          <History className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-800 font-bold text-base">No matching history records</p>
          <p className="text-slate-400 text-sm mt-1">Verify search keywords or log a support call session.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHistory.map((sess) => (
            <div key={sess.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-400 font-mono">ID: {sess.id.substring(0, 8)}...</span>
                  <span className={`text-[8px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full border ${
                    sess.status === 'COMPLETED' ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {sess.status}
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-950 mt-2">{sess.title || 'Support Call Session'}</h3>
                <div className="text-[11px] text-slate-500 font-semibold space-y-1 pt-1">
                  <p>Agent: <strong className="text-slate-700">{sess.agent?.email || 'N/A'}</strong></p>
                  {sess.customerName && <p>Customer: <strong className="text-emerald-700">{sess.customerName}</strong></p>}
                  <p className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(sess.createdAt).toLocaleDateString()} at {new Date(sess.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <a
                  href={`#/history/${sess.id}`}
                  className="bg-stone-900 hover:bg-stone-850 text-white font-bold py-2 px-4 rounded-lg text-xs tracking-normal shadow-sm flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  View Details & Transcripts
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 7. PAGE: DETAILED COMPLETED SESSION TRANSCRIPT REVIEW
// ==========================================
function HistoryDetailIdPage({ sessionId }: { sessionId?: string }) {
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    const fetchDetailedLogs = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        const data = await res.json();
        if (res.ok) {
          setSession(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetailedLogs();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-stone-900 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm mt-4">Loading call history details...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl max-w-md w-full text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">Session File Missing</h1>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">The requested history ID correlates to a missing database model record.</p>
          <button onClick={() => { window.location.hash = '#/history'; }} className="w-full bg-stone-900 text-white font-bold py-2 px-4 rounded">Back to History Link</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 animate-fade-in" id="history-details-section">
      {/* Header breadcrumb navigations */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <a href="#/history" className="text-xs font-bold text-stone-900 hover:text-stone-750 flex items-center gap-1 mb-2">
            ← Back to operational archive
          </a>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Review: {session.title || 'Support Session'}</h1>
          <p className="text-xs text-slate-500 font-medium">Unique Session: <code className="text-indigo-600 font-mono select-all font-bold">{session.id}</code></p>
        </div>
        <span className={`self-start sm:self-center text-[10px] uppercase font-black px-3.5 py-1 rounded-full border ${
          session.status === 'COMPLETED' ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {session.status}
        </span>
      </div>

      {/* Grid: metadata card and transcripts file split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Metadatas sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-wider">Operational Audit</h3>
            
            <div className="space-y-3.5 text-xs font-semibold text-slate-600">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Support Agent:</span>
                <span className="text-slate-900">{session.agent?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Customer User:</span>
                <span className="text-emerald-700">{session.customerName || 'N/A (No join)'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Created Date:</span>
                <span className="text-slate-900">{new Date(session.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span>Created Time:</span>
                <span className="text-slate-900">{new Date(session.createdAt).toLocaleTimeString()}</span>
              </div>
              {session.startedAt && (
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span>Call Started:</span>
                  <span className="text-slate-900">{new Date(session.startedAt).toLocaleTimeString()}</span>
                </div>
              )}
              {session.endedAt && (
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span>Call Ended:</span>
                  <span className="text-slate-900">{new Date(session.endedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Secure attachments transferred list */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-sm">Shared Attachments ({session.attachments?.length || 0})</h3>
            {(!session.attachments || session.attachments.length === 0) ? (
              <p className="text-slate-400 text-xs py-3 text-center">No files were shared in session.</p>
            ) : (
              <div className="space-y-3">
                {session.attachments.map((file: any) => (
                  <div key={file.id} className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="truncate flex-1 space-y-0.5">
                      <p className="font-bold text-slate-800 truncate">{file.fileName}</p>
                      <p className="text-[10px] text-slate-400 font-medium font-normal">Sender: {file.senderName} ({file.senderRole})</p>
                    </div>
                    <a
                      href={file.fileUrl}
                      download={file.fileName}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-stone-900 hover:bg-stone-800 text-white p-2 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                      title="Download transferred asset"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Saved Chats Transcript File */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-stone-500" />
            Call Messenger Chat Transcript ({session.messages?.length || 0})
          </h3>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm min-h-[300px] overflow-hidden">
            {(!session.messages || session.messages.length === 0) ? (
              <p className="text-slate-400 text-xs text-center py-20 font-medium">No chat records were written during this call.</p>
            ) : (
              <div className="space-y-5">
                {session.messages.map((m: any) => {
                  const isSys = m.senderRole === 'SYSTEM';
                  if (isSys) {
                    try {
                      const fileContent = JSON.parse(m.text);
                      return (
                        <div key={m.id} className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between gap-4 text-xs font-semibold">
                          <span className="text-emerald-800 truncate">📎 System Transfer File: <strong>{fileContent.fileName}</strong></span>
                        </div>
                      );
                    } catch (e) {
                      return (
                        <div key={m.id} className="text-center">
                          <span className="text-[10px] text-slate-400 italic font-mono bg-slate-50 py-1 px-3.5 border border-slate-150 rounded-full">{m.text}</span>
                        </div>
                      );
                    }
                  }

                  return (
                    <div key={m.id} className="flex flex-col space-y-1 text-xs">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                        <strong className="text-slate-700">{m.senderName}</strong>
                        <span className="text-emerald-600">({m.senderRole})</span>
                        <span>•</span>
                        <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="bg-slate-50 border border-slate-150 py-3.5 px-4 rounded-xl text-slate-800 font-semibold leading-relaxed whitespace-pre-wrap max-w-full">
                        {m.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ==========================================
// 8. PAGE: RECORDING ARCHIVES
// ==========================================
function RecordingsPage({
  setGlobalError,
  setGlobalSuccess
}: {
  setGlobalError: (err: string | null) => void;
  setGlobalSuccess: (sc: string | null) => void;
}) {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecordings = async () => {
    try {
      const res = await fetch('/api/recordings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('resolve_token')}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setRecordings(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
    const interval = setInterval(fetchRecordings, 8000); // Check processing states transitions
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-stone-900 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm mt-4">Loading recordings index...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 animate-fade-in" id="recordings-page-view">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Call Recording Assets</h1>
        <p className="text-sm text-slate-500 mt-1">Review, monitor processing logs and download call tape footage</p>
      </div>

      {recordings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center" id="empty-recordings-state">
          <Play className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-800 font-bold text-base">No recording assets found</p>
          <p className="text-slate-400 text-sm mt-1">Agents can click the "Record Call" button inside any active Session Room.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recordings.map((rec) => (
            <div key={rec.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-extrabold text-slate-900">{rec.session?.title || 'Support Session Call'}</h3>
                  <span className={`text-[9px] uppercase font-black px-2.5 py-0.5 rounded-full tracking-wider ${
                    rec.status?.toUpperCase() === 'READY' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    rec.status?.toUpperCase() === 'PROCESSING' ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse' :
                    'bg-red-50 text-red-700 border border-red-200 animate-pulse'
                  }`}>
                    {rec.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-semibold space-y-1">
                  <p>Recording ID: <code className="bg-slate-50 rounded py-0.5 px-1 font-mono text-[10px]">{rec.id}</code></p>
                  <p>Session ID: <code className="bg-slate-50 rounded py-0.5 px-1 font-mono text-[10px]">{rec.sessionId || rec.session_id}</code></p>
                  <p>Filename: <span className="text-slate-800 font-mono text-[10.5px]">{rec.fileName || rec.filename || 'N/A'}</span></p>
                  <p>Uploaded By: <span className="text-slate-700 font-bold">{rec.uploadedBy || rec.uploaded_by || rec.session?.agent?.email || 'N/A'}</span></p>
                  <p className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Started: {new Date(rec.startedAt || rec.created_at).toLocaleString()}
                    {(rec.durationSec || rec.duration) && ` | Duration: ${(rec.durationSec || rec.duration)}s`}
                    {(rec.fileSize || rec.file_size) && ` | File Size: ${(((rec.fileSize || rec.file_size)) / (1024 * 1024)).toFixed(2)} MB`}
                  </p>
                </div>
              </div>

              <div className="w-full md:w-auto self-stretch flex items-center md:justify-end">
                {rec.status?.toUpperCase() === 'READY' && (rec.downloadUrl || rec.download_url) ? (
                  <div className="flex flex-col gap-2 w-full md:w-64">
                    {/* In-browser video preview */}
                    <video
                      src={rec.downloadUrl || rec.download_url}
                      controls
                      className="w-full rounded-lg border border-slate-200 bg-black"
                      style={{ maxHeight: '140px' }}
                    />
                    {/* Download button */}
                    <a
                      href={rec.downloadUrl || rec.download_url}
                      download={rec.fileName || rec.filename || `recording-${rec.id}.webm`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-stone-900 hover:bg-stone-700 text-white font-extrabold py-2 px-4 rounded-lg text-xs tracking-normal shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      onClick={() => setGlobalSuccess('Downloading recording from Supabase Storage...')}
                    >
                      <Download className="w-4 h-4" />
                      Download Recording
                    </a>
                  </div>
                ) : rec.status?.toUpperCase() === 'READY' ? (
                  <div className="w-full md:w-auto text-xs py-2 px-4 bg-slate-50 text-slate-400 border border-slate-150 rounded-lg text-center font-bold">
                    ⚙️ No file URL available
                  </div>
                ) : (
                  <div className="w-full md:w-auto text-xs py-2 px-4 bg-slate-50 text-slate-400 border border-slate-150 rounded-lg text-center font-bold">
                    ⚙️ Processing Tape Footages
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 8. PAGE: COMPLETE SYSTEM AUDIT RECORD LOGS
// ==========================================
function AdminLogsPage() {
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllLogs = async () => {
      try {
        const res = await fetch('/api/admin/logs', {
          headers: { Authorization: `Bearer ${localStorage.getItem('resolve_token')}` },
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setLogs(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAllLogs();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-stone-900 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-xs mt-4">Loading operational audit registry...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 animate-fade-in" id="admin-audit-logs-view">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Security Audit</h1>
        <p className="text-sm text-slate-500 mt-1">Audit security operations trace, user disconnects, and recording captures</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-left text-xs font-semibold text-slate-600">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-150 text-[10px] uppercase tracking-wider text-slate-500">
              <th className="py-4 px-6 font-black">Logged Time</th>
              <th className="py-4 px-6 font-black">Event Scope Code</th>
              <th className="py-4 px-6 font-black scroll-smooth">Session Scope</th>
              <th className="py-4 px-6 font-black">Detailed Operations Trace Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 px-6 text-center text-slate-400 font-medium">No recorded audit log trail.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 whitespace-nowrap text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                      log.type === 'SESSION_CREATED' ? 'bg-[#10b981]/10 text-emerald-700' :
                      log.type === 'SESSION_ENDED' ? 'bg-stone-100 text-stone-600' :
                      log.type.startsWith('RECORDING') ? 'bg-red-50 text-red-600' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap text-slate-500 font-bold truncate max-w-[150px]">
                    {log.session?.title || 'Unknown Room'}
                  </td>
                  <td className="py-4 px-6 text-slate-800 font-bold leading-normal">
                    {log.detail}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
