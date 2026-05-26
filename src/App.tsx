/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Server, Shield, Users, Terminal, Settings, Bell, LogOut, Menu, X, 
  ChevronRight, Calendar, Mail, User as UserIcon, ShieldAlert, Zap, Globe 
} from 'lucide-react';
import { User, UserRole, Claim, ClaimStatus, Notification, AuditLog, AppSettings, DashboardStats } from './types.js';
import { HomeHero } from './components/HomeHero.jsx';
import { AuthPage } from './components/AuthPage.jsx';
import { ClaimCard } from './components/ClaimCard.jsx';
import { StatsChart } from './components/StatsChart.jsx';
import { AdminUsersList } from './components/AdminUsersList.jsx';
import { AdminClaimsList } from './components/AdminClaimsList.jsx';
import { AdminAuditLogs } from './components/AdminAuditLogs.jsx';
import { AdminSettings } from './components/AdminSettings.jsx';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('hdx_token'));
  const [view, setView] = useState<'home' | 'auth' | 'dashboard'>('home');
  const [adminTab, setAdminTab] = useState<'stats' | 'claims' | 'users' | 'logs' | 'settings'>('stats');
  
  // Dashboard states
  const [claim, setClaim] = useState<Claim | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Admin States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [claimsList, setClaimsList] = useState<Claim[]>([]);
  const [logsList, setLogsList] = useState<AuditLog[]>([]);
  const [sysSettings, setSysSettings] = useState<AppSettings>({
    discord_invite: 'https://discord.gg/hdxcloud',
    discord_webhook_url: ''
  });

  // UI state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [screenLoading, setScreenLoading] = useState(true);

  // Initialize: Load self profile if token exists
  useEffect(() => {
    const initAuth = async () => {
      if (!token) {
        setScreenLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setView('dashboard');
          
          // Load relative context
          fetchUserContext(token);
          if (data.user.role === UserRole.ADMIN) {
            fetchAdminContext(token);
          }
        } else {
          // Token expired or invalid
          handleLogout();
        }
      } catch (err) {
        console.error('Core authentication context link failed', err);
      } finally {
        setScreenLoading(false);
      }
    };

    initAuth();
  }, [token]);

  // General user loading functions
  const fetchUserContext = async (sessionToken: string) => {
    try {
      // 1. Claim status
      const claimRes = await fetch('/api/claim/status', {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (claimRes.ok) {
        const d = await claimRes.json();
        setClaim(d.claim);
      }

      // 2. Notifications
      const notifRes = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (notifRes.ok) {
        const d = await notifRes.json();
        setNotifications(d.notifications);
        setUnreadCount(d.notifications.filter((n: any) => !n.is_read).length);
      }

      // 3. Settings (Publicly required invite links)
      // Since settings might be admin only, fallback to default invite if route fails or restricted.
      const settRes = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (settRes.ok) {
        const d = await settRes.json();
        setSysSettings(d.settings);
      }
    } catch (err) {
      console.error('Failed fetching user credentials ledger', err);
    }
  };

  // Admin Ledger loading
  const fetchAdminContext = async (sessionToken: string) => {
    try {
      const h = { 'Authorization': `Bearer ${sessionToken}` };
      
      // 1. Stats
      const statsRes = await fetch('/api/admin/stats', { headers: h });
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats);
      }

      // 2. Users list
      const usersRes = await fetch('/api/admin/users', { headers: h });
      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsersList(d.users);
      }

      // 3. Claims list
      const claimsRes = await fetch('/api/admin/claims', { headers: h });
      if (claimsRes.ok) {
        const d = await claimsRes.json();
        setClaimsList(d.claims);
      }

      // 4. Audit logs
      const logsRes = await fetch('/api/admin/audit-logs', { headers: h });
      if (logsRes.ok) {
        const d = await logsRes.json();
        setLogsList(d.logs);
      }
    } catch (err) {
      console.error('Failed compiling admin contextual dashboard', err);
    }
  };

  // Authenticaton callbacks
  const handleAuthSuccess = (sessionToken: string, userProfile: User) => {
    localStorage.setItem('hdx_token', sessionToken);
    setToken(sessionToken);
    setUser(userProfile);
    setView('dashboard');
    setIsMobileMenuOpen(false);

    // Bootstrap data queues
    fetchUserContext(sessionToken);
    if (userProfile.role === UserRole.ADMIN) {
      fetchAdminContext(sessionToken);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignored
    }
    localStorage.removeItem('hdx_token');
    setToken(null);
    setUser(null);
    setClaim(null);
    setNotifications([]);
    setView('home');
    setIsMobileMenuOpen(false);
  };

  // CLAIM MUTATION CONTROLLER CLIENT HOOKS
  const handleClaimCreate = async () => {
    if (!token) return;
    const res = await fetch('/api/claim/create', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const d = await res.json();
    if (!res.ok) {
      throw new Error(d.error || 'Claim creation failed');
    }
    setClaim(d.claim);
    // Refresh admin stats if applicable
    if (user?.role === UserRole.ADMIN) fetchAdminContext(token);
  };

  const handleClaimCancel = async () => {
    if (!token) return;
    const res = await fetch('/api/claim/cancel', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const d = await res.json();
    if (!res.ok) {
      throw new Error(d.error || 'Claim cancellation failed');
    }
    setClaim(prev => prev ? { ...prev, status: ClaimStatus.CANCELLED } : null);
    if (user?.role === UserRole.ADMIN) fetchAdminContext(token);
  };

  // NOTIFICATION UTILITIES
  const handleMarkNotificationsRead = async () => {
    if (!token) return;
    await fetch('/api/notifications/read', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  // ADMIN ACTION INTEGRATORS
  const handleBanUser = async (targetId: string) => {
    if (!token) return;
    const res = await fetch('/api/admin/ban', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: targetId })
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Banning action failed.');
    }
    // Sync lists
    fetchAdminContext(token);
  };

  const handleUnbanUser = async (targetId: string) => {
    if (!token) return;
    const res = await fetch('/api/admin/unban', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: targetId })
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Unbanning action failed.');
    }
    fetchAdminContext(token);
  };

  const handleDeleteUser = async (targetId: string) => {
    if (!token) return;
    const res = await fetch(`/api/admin/users/${targetId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Deletion failed');
    }
    fetchAdminContext(token);
  };

  const handleSendCustomNotification = async (targetId: string, titleStr: string, msgStr: string) => {
    if (!token) return;
    const res = await fetch('/api/admin/send-notification', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId: targetId, title: titleStr, message: msgStr })
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Failed to dispatch custom alert payload');
    }
    fetchAdminContext(token);
  };

  // CLAIMS HANDLERS (BULK & SINGLE COMBINED ON BACKEND)
  const handleApproveClaims = async (ids: string[]) => {
    if (!token) return;
    const res = await fetch('/api/admin/approve', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ claimIds: ids })
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Bulk approvals failed');
    }
    fetchAdminContext(token);
    // Reinstate self claims updates if administrator test-claimed
    fetchUserContext(token);
  };

  const handleRejectClaims = async (ids: string[]) => {
    if (!token) return;
    const res = await fetch('/api/admin/reject', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ claimIds: ids })
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Bulk rejections failed');
    }
    fetchAdminContext(token);
    fetchUserContext(token);
  };

  const handleDeleteClaim = async (claimId: string) => {
    if (!token) return;
    const res = await fetch(`/api/admin/claims/${claimId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Claim log deletion failed');
    }
    fetchAdminContext(token);
    fetchUserContext(token);
  };

  // Save Settings
  const handleSaveSettings = async (updatedSettings: AppSettings) => {
    if (!token) return;
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedSettings)
    });
    const d = await res.json();
    if (!res.ok) {
      throw new Error(d.error || 'Saving configuration parameters failed');
    }
    setSysSettings(d.settings);
    fetchAdminContext(token);
  };

  if (screenLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-mono gap-3 text-xs">
        <Server className="w-8 h-8 text-[#5865F2] animate-bounce" />
        HDX CLOUD SECURE TERMINAL BOOTUP SEQUENCE...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans" id="hdx-master-frame">
      
      {/* 1. Header Area */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            onClick={() => setView(user ? 'dashboard' : 'home')} 
            className="text-xl font-extrabold tracking-tight text-white select-none cursor-pointer flex items-center gap-2"
            id="hdx-logo-title"
          >
            <Server className="w-5 h-5 text-[#5865F2]" />
            HDX <span className="text-[#5865F2]">CLOUD</span>
          </div>

          {/* Navigation link lists */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            {view === 'home' && (
              <>
                <a href="#features" className="hover:text-zinc-200 transition-colors">Core Hardware</a>
                <a href="#features" className="hover:text-zinc-200 transition-colors">SLA Guarantee</a>
              </>
            )}
            
            {user && (
              <>
                <button 
                  onClick={() => { setView('dashboard'); setIsNotifOpen(false); }} 
                  className={`hover:text-zinc-200 transition-colors ${view === 'dashboard' ? 'text-[#00C896] font-bold' : ''}`}
                >
                  Dashboard
                </button>
              </>
            )}

            {/* Notification alert Bell */}
            {user && (
              <div className="relative">
                <button 
                  onClick={() => { setIsNotifOpen(!isNotifOpen); if(!isNotifOpen) handleMarkNotificationsRead(); }}
                  className="p-2 hover:bg-slate-800 rounded-lg text-zinc-400 hover:text-white transition-colors relative"
                  id="notifications-bell-btn"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  )}
                </button>

                {/* Notifications dropdown list overlay */}
                <AnimatePresence>
                  {isNotifOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 z-50 max-h-96 overflow-y-auto"
                      id="notifications-dropdown-panel"
                    >
                      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Control notifications</span>
                        <button onClick={() => setIsNotifOpen(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
                      </div>

                      {notifications.length === 0 ? (
                        <p className="text-xs text-zinc-500 text-center py-6 font-mono">NO RECENT SYSTEM BROADCASTS.</p>
                      ) : (
                        <div className="space-y-3">
                          {notifications.map(n => (
                            <div key={n.id} className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-850">
                              <h5 className="text-xs font-bold text-[#00C896] mb-1 flex items-center justify-between">
                                {n.title}
                                {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                              </h5>
                              <p className="text-[11px] text-zinc-400 leading-normal">{n.message}</p>
                              <span className="text-[9px] text-zinc-600 block mt-1.5 font-mono">{new Date(n.created_at).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Profile trigger indicator / sign-out button */}
            {user ? (
              <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
                <div className="flex items-center gap-2">
                  <img 
                    src={user.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.username}`} 
                    alt="avatar profile"
                    className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800"
                    referrerPolicy="no-referrer"
                  />
                  <div className="text-left select-none">
                    <div className="text-xs font-bold text-white">{user.username}</div>
                    <div className="text-[10px] text-zinc-500 capitalize">{user.role} role</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  id="header-logout-btn"
                  className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-zinc-500 transition-colors"
                  title="Sign out of sessions"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setView('auth')}
                id="header-login-btn"
                className="px-4.5 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-xs font-bold text-white rounded-lg transition-colors cursor-pointer"
              >
                Access Control Node
              </button>
            )}
          </nav>

          {/* Mobile hamburger icon trigger */}
          <div className="flex items-center gap-3 md:hidden">
            {user && (
              <button 
                onClick={() => { setIsNotifOpen(!isNotifOpen); if(!isNotifOpen) handleMarkNotificationsRead(); }}
                className="p-2 bg-slate-850 hover:bg-slate-800 rounded-lg text-zinc-400 relative"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded bg-red-500" />}
              </button>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 bg-slate-850 hover:bg-slate-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer menu banner */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-slate-905 border-b border-slate-800 px-6 py-4 space-y-4"
            id="mobile-navigation-drawer"
          >
            {user && (
              <div className="flex items-center gap-3 py-2 border-b border-slate-800 mb-2">
                <img 
                  src={user.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.username}`} 
                  alt="profile image"
                  className="w-10 h-10 rounded-lg bg-indigo-950 border border-slate-800"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="text-sm font-bold text-white">{user.username}</div>
                  <div className="text-[11px] text-zinc-500 capitalize">{user.role} tier</div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 text-sm text-zinc-400">
              <button 
                onClick={() => { setView('home'); setIsMobileMenuOpen(false); }}
                className="text-left py-2 hover:text-white"
              >
                Home page
              </button>
              {user ? (
                <>
                  <button 
                    onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }}
                    className="text-left py-2 hover:text-white"
                  >
                    Dashboard Space
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="text-left py-2 text-red-400 font-semibold"
                  >
                    Logout from HDX Cloud
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => { setView('auth'); setIsMobileMenuOpen(false); }}
                  className="w-full py-2.5 bg-[#5865F2] text-white font-bold rounded-lg text-center"
                >
                  Create / Login Account
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Main Content Routing viewports */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <HomeHero 
                onJoin={() => setView('auth')} 
                isAuthenticated={!!user} 
                onDashboard={() => setView('dashboard')}
              />
            </motion.div>
          )}

          {view === 'auth' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <AuthPage 
                onAuthSuccess={handleAuthSuccess} 
                onBackToHome={() => setView('home')} 
              />
            </motion.div>
          )}

          {view === 'dashboard' && user && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-7xl mx-auto py-10 px-6"
            >
              {/* If user is Admin, show double layout selection (Admin clearance space & user spaces) */}
              {user.role === UserRole.ADMIN ? (
                /* ----------------- ADMIN COMPREHENSIVE COMPONENT ----------------- */
                <div id="admin-overall-dashboard">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8 border-b border-slate-800 pb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-6 h-6 text-red-500" />
                        <h2 className="text-2xl font-black text-white uppercase tracking-wider">HDX Cloud Staff Room</h2>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Cleared Administrator Session active. Operator node: <span className="text-[#00C896] hover:underline cursor-pointer">{user.username}</span>.
                      </p>
                    </div>

                    {/* Left Admin Selection tab pills */}
                    <div className="flex flex-wrap bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs select-none">
                      <button
                        onClick={() => setAdminTab('stats')}
                        className={`px-4 py-2 rounded-lg transition-all text-xs font-bold ${adminTab === 'stats' ? 'bg-[#5865F2] text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
                      >
                        Ledger Stats
                      </button>
                      <button
                        onClick={() => setAdminTab('claims')}
                        className={`px-4 py-2 rounded-lg transition-all text-xs font-bold ${adminTab === 'claims' ? 'bg-[#5865F2] text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
                      >
                        Client Claims
                      </button>
                      <button
                        onClick={() => setAdminTab('users')}
                        className={`px-4 py-2 rounded-lg transition-all text-xs font-bold ${adminTab === 'users' ? 'bg-[#5865F2] text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
                      >
                        Users Ledger
                      </button>
                      <button
                        onClick={() => setAdminTab('logs')}
                        className={`px-4 py-2 rounded-lg transition-all text-xs font-bold ${adminTab === 'logs' ? 'bg-[#5865F2] text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
                      >
                        Audit Records
                      </button>
                      <button
                        onClick={() => setAdminTab('settings')}
                        className={`px-4 py-2 rounded-lg transition-all text-xs font-bold ${adminTab === 'settings' ? 'bg-[#5865F2] text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
                      >
                        System settings
                      </button>
                    </div>
                  </div>

                  {/* ADMIN MAIN TABS SWITCH */}
                  <AnimatePresence mode="wait">
                    {adminTab === 'stats' && stats && (
                      <motion.div 
                        key="admin-stats"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-8 animate-in"
                        id="admin-tab-stats-panel"
                      >
                        {/* Metrics Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                            <span className="text-zinc-500 uppercase tracking-wider text-[9px] font-bold block mb-1">Global Accounts</span>
                            <div className="text-2xl font-black text-white">{stats.totalUsers}</div>
                          </div>
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                            <span className="text-zinc-500 uppercase tracking-wider text-[9px] font-bold block mb-1">Total Claims</span>
                            <div className="text-2xl font-black text-white">{stats.totalClaims}</div>
                          </div>
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl border-l-[#5865F2]/40 border-l-2">
                            <span className="text-[#5865F2] uppercase tracking-wider text-[9px] font-bold block mb-1">Pending Clearance</span>
                            <div className="text-2xl font-black text-white">{stats.pendingClaims}</div>
                          </div>
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl border-l-[#00C896]/40 border-l-2">
                            <span className="text-[#00C896] uppercase tracking-wider text-[9px] font-bold block mb-1">Active Approved</span>
                            <div className="text-2xl font-black text-white">{stats.approvedClaims}</div>
                          </div>
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                            <span className="text-zinc-500 uppercase tracking-wider text-[9px] font-bold block mb-1">Rejected claims</span>
                            <div className="text-2xl font-black text-white">{stats.rejectedClaims}</div>
                          </div>
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                            <span className="text-zinc-500 uppercase tracking-wider text-[9px] font-bold block mb-1">Suspended Accs</span>
                            <div className="text-2xl font-black text-red-500">{stats.bannedUsers}</div>
                          </div>
                        </div>

                        {/* Interactive analytical SVG graphs */}
                        <StatsChart registrations={stats.dailyRegistrations} claimActivity={stats.claimActivity} />

                        {/* Quick admin simulator tools */}
                        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                              <Zap className="w-4.5 h-4.5 text-[#5865F2]" />
                              Admin Sandbox Test Loop
                            </h4>
                            <p className="text-xs text-zinc-400">Want to test how a normal user claims a server? View the standard user dashboard view directly below.</p>
                          </div>
                          
                          <a href="#test-user-view" className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-xs font-semibold rounded-lg text-zinc-300 transition-colors border border-slate-800">
                            Jump to Test-User Module
                          </a>
                        </div>
                      </motion.div>
                    )}

                    {adminTab === 'users' && (
                      <motion.div 
                        key="admin-users"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <AdminUsersList 
                          users={usersList} 
                          onBanUser={handleBanUser} 
                          onUnbanUser={handleUnbanUser} 
                          onDeleteUser={handleDeleteUser}
                          onSendCustomNotification={handleSendCustomNotification}
                        />
                      </motion.div>
                    )}

                    {adminTab === 'claims' && (
                      <motion.div 
                        key="admin-claims"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <AdminClaimsList 
                          claims={claimsList} 
                          onApproveClaims={handleApproveClaims} 
                          onRejectClaims={handleRejectClaims} 
                          onDeleteClaim={handleDeleteClaim} 
                        />
                      </motion.div>
                    )}

                    {adminTab === 'logs' && (
                      <motion.div 
                        key="admin-logs"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <AdminAuditLogs logs={logsList} />
                      </motion.div>
                    )}

                    {adminTab === 'settings' && (
                      <motion.div 
                        key="admin-settings"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <AdminSettings settings={sysSettings} onSaveSettings={handleSaveSettings} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Divider and Normal User flow simulator interface below */}
                  <div className="mt-16 pt-12 border-t border-slate-800" id="test-user-view">
                    <div className="mb-6">
                      <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#00C896] bg-[#00C896]/10 border border-[#00C896]/20 px-3 py-1 rounded-full">Simulator Area</span>
                      <h3 className="text-lg font-bold text-white mt-3">Active Administrator - Interactive User View</h3>
                      <p className="text-xs text-zinc-400 mt-1">This section renders your personal user-level claim status card as configured in the central database.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 auto-rows-fr">
                      <div className="lg:col-span-8 flex flex-col">
                        <ClaimCard 
                          claim={claim} 
                          onClaimCreate={handleClaimCreate} 
                          onClaimCancel={handleClaimCancel} 
                          discordInvite={sysSettings.discord_invite}
                        />
                      </div>
                      
                      <div className="lg:col-span-4 bg-[#1E293B] border border-[#334155] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-[#5865F2]" />
                            Simulated Profile Context
                          </h4>
                          <div className="flex items-center gap-3 mb-4 bg-slate-950/20 p-3 rounded-2xl border border-slate-800/30">
                            <img src={user.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.username}`} alt="Avatar" className="w-10 h-10 rounded border border-slate-800" referrerPolicy="no-referrer" />
                            <div>
                              <div className="text-xs font-bold text-white">{user.username}</div>
                              <div className="text-[10px] text-[#00C896] font-semibold">{user.email}</div>
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-[11px] text-zinc-400">
                            <div className="flex justify-between border-b border-slate-700/40 pb-1.55">
                              <span>Registered Date</span>
                              <span className="text-zinc-200">{new Date(user.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-700/40 pb-1.55">
                              <span>Role clearance</span>
                              <span className="text-[#5865F2] font-semibold uppercase">{user.role}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Login IP Address</span>
                              <span className="font-mono text-zinc-200">{user.ip_address || '127.0.0.1'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800 text-[10px] text-zinc-500 leading-normal font-sans mt-4">
                          Tip: Click "Claim Free Server" above to test the claim queues. You'll generate a code that instantly populates in the "Client Claims" tab above!
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ----------------- STANDALONE INDEPENDENT USER DASHBOARD ----------------- */
                <div id="user-standalone-dashboard" className="space-y-8 animate-in text-sans">
                  {/* Account Welcome banner header */}
                  <div className="mb-8 border-b border-slate-850 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Welcome back, <span className="text-[#00C896]">{user.username}</span>
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1">Configure your active server nodes, check authorization clearances, and monitor claim queues.</p>
                    </div>

                    <div className="text-xs text-zinc-400 text-left md:text-right flex flex-col font-mono uppercase tracking-wider">
                      <div>IP Anchor: <span className="text-zinc-200 font-bold">{user.ip_address || '127.0.0.1'}</span></div>
                      <div className="mt-1 text-[10px]">Cleared on: {new Date(user.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {/* MATHEMATICALLY BALANCED BENTO GRID SYSTEM */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 auto-rows-fr">
                    {/* Bento Box 1: ClaimCard status/command center */}
                    <div className="lg:col-span-8 flex flex-col">
                      <ClaimCard 
                        claim={claim} 
                        onClaimCreate={handleClaimCreate} 
                        onClaimCancel={handleClaimCancel} 
                        discordInvite={sysSettings.discord_invite}
                      />
                    </div>

                    {/* Bento Box 2: Profile Metadata */}
                    <div className="lg:col-span-4 bg-[#1E293B] border border-[#334155] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center gap-2">
                          <UserIcon className="w-4 h-4 text-[#5865F2]" />
                          Account specifications
                        </h3>

                        <div className="flex items-center gap-3 mb-6 bg-slate-950/20 p-3 rounded-2xl border border-slate-800/30">
                          <img 
                            src={user.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.username}`} 
                            alt="Avatar" 
                            className="w-12 h-12 rounded-xl border border-slate-700/60 bg-slate-900" 
                            referrerPolicy="no-referrer" 
                          />
                          <div>
                            <div className="text-sm font-extrabold text-white">{user.username}</div>
                            <div className="text-xs text-[#00C896] font-semibold">{user.email}</div>
                          </div>
                        </div>

                        <div className="space-y-3 text-xs text-zinc-400 font-sans">
                          <div className="flex justify-between border-b border-slate-700/40 pb-2">
                            <span>Security Clearance</span>
                            <span className="text-[#5865F2] font-semibold uppercase">{user.role} Member</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-700/40 pb-2">
                            <span>System Clearance ID</span>
                            <span className="text-zinc-500 font-mono text-[10px] truncate max-w-[150px]" title={user.id}>{user.id}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleLogout}
                        className="w-full mt-6 py-3 bg-slate-950/40 hover:bg-slate-950 hover:text-red-400 border border-slate-800 rounded-xl text-xs font-bold text-zinc-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        De-authorize Control Session
                      </button>
                    </div>

                    {/* Bento Box 3: Activation Policy */}
                    <div className="lg:col-span-4 bg-[#1E293B] border border-[#334155] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">
                          Claim Activation Policy
                        </h3>
                        <ul className="space-y-3 text-xs text-zinc-400 leading-relaxed font-sans">
                          <li className="flex gap-2">
                            <span className="text-[#00C896] select-none font-bold">✓</span>
                            <span>Every user can request exactly one cloud instance. Multiple submissions are flagged.</span>
                          </li>
                          <li className="flex gap-2">
                            <span className="text-[#00C896] select-none font-bold">✓</span>
                            <span>Claim approval issues unique codes registered against your clearance key.</span>
                          </li>
                          <li className="flex gap-2">
                            <span className="text-[#00C896] select-none font-bold">✓</span>
                            <span>The claim code must be deployed inside our official Discord server within 7 days.</span>
                          </li>
                          <li className="flex gap-2">
                            <span className="text-[#5865F2] select-none font-bold">ℹ</span>
                            <span>Servers unused for more than 14 days may trigger automatic pruning.</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Bento Box 4: Recent Bulletins / Notification feeds */}
                    <div className="lg:col-span-4 bg-[#1E293B] border border-[#334155] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4 flex items-center justify-between">
                          System Announcements
                          <span className="px-2 py-0.5 rounded-full bg-slate-950/40 text-[9px] text-[#00C896] border border-slate-800">Direct</span>
                        </h3>
                        
                        <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                          {notifications.length === 0 ? (
                            <div className="text-center py-8 text-zinc-500 text-xs font-mono">
                              NO RECENT SYSTEM BROADCASTS
                            </div>
                          ) : (
                            notifications.slice(0, 3).map(n => (
                              <div key={n.id} className="p-2.5 bg-slate-950/40 border border-slate-800 rounded-xl">
                                <div className="text-xs font-bold text-white flex justify-between items-center gap-1.5 mb-1">
                                  <span>{n.title}</span>
                                  {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />}
                                </div>
                                <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">{n.message}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="text-[9px] text-zinc-500 font-mono uppercase text-right pt-2 border-t border-slate-800/40">
                        Operational status: Stable
                      </div>
                    </div>

                    {/* Bento Box 5: Discord community server */}
                    <div className="lg:col-span-4 bg-[#1E293B] border border-[#334155] rounded-3xl p-6 shadow-xl flex flex-col justify-between" id="active-discord-invite-card">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                            Join Unified community
                          </h3>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed mb-6 font-sans">
                          Connect with verified developers, share custom scripts, access deployment tutorials, and receive instant active server notifications.
                        </p>
                      </div>
                      
                      <a
                        href={sysSettings.discord_invite}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] hover:shadow-lg hover:shadow-[#5865F2]/20 active:scale-98 text-xs font-extrabold uppercase tracking-wider rounded-xl text-white text-center block transition-all"
                      >
                        Launch Guild Invite
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
