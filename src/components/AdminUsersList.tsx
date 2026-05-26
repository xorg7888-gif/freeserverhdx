/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldAlert, Trash2, Search, UserCheck, ShieldX, Eye } from 'lucide-react';
import { User } from '../types.js';

interface AdminUsersListProps {
  users: User[];
  onBanUser: (id: string) => Promise<void>;
  onUnbanUser: (id: string) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onSendCustomNotification: (userId: string, title: string, msg: string) => Promise<void>;
}

export const AdminUsersList: React.FC<AdminUsersListProps> = ({
  users,
  onBanUser,
  onUnbanUser,
  onDeleteUser,
  onSendCustomNotification
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');

  // Filter users based on query
  const filteredUsers = users.filter(user => {
    const q = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      (user.ip_address && user.ip_address.includes(q)) ||
      user.id.includes(q)
    );
  });

  const handleBan = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to suspend/ban user ${name}? This will instantly revoke access to their dashboard.`)) {
      return;
    }
    setErrorText('');
    setSuccessText('');
    try {
      await onBanUser(id);
      setSuccessText(`Successfully suspended ${name}`);
    } catch (err: any) {
      setErrorText(err.message || 'Suspension failed');
    }
  };

  const handleUnban = async (id: string, name: string) => {
    setErrorText('');
    setSuccessText('');
    try {
      await onUnbanUser(id);
      setSuccessText(`Successfully reactivated account for ${name}`);
    } catch (err: any) {
      setErrorText(err.message || 'Reactivation failed');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Dangerous action! Are you sure you want to permanently delete user ${name} and all their claim profiles?`)) {
      return;
    }
    setErrorText('');
    setSuccessText('');
    try {
      await onDeleteUser(id);
      setSuccessText(`Permanently deleted user '${name}' context`);
      if (selectedUser?.id === id) setSelectedUser(null);
    } catch (err: any) {
      setErrorText(err.message || 'Deletion failed');
    }
  };

  const notifyUserClick = (user: User) => {
    setSelectedUser(user);
    setNotifTitle('Server Allocation Message');
    setNotifMessage('');
    setIsNotifModalOpen(true);
    setSuccessText('');
    setErrorText('');
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !notifTitle || !notifMessage) return;
    
    setIsLoading(true);
    setErrorText('');
    setSuccessText('');
    try {
      await onSendCustomNotification(selectedUser.id, notifTitle, notifMessage);
      setSuccessText(`Custom alert dispatched to ${selectedUser.username}`);
      setIsNotifModalOpen(false);
    } catch (err: any) {
      setErrorText(err.message || 'Failed to dispatch custom message');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6" id="admin-user-deck">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white uppercase tracking-wider text-sm text-[#00C896]">Global Database Accounts</h3>
          <p className="text-xs text-zinc-400 mt-1">Manage security clearances, analyze client registration records, IP histories, and ban abusers.</p>
        </div>

        {/* Search input bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search username, email, IP, ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg outline-none text-white focus:border-[#5865F2] transition-colors"
          />
        </div>
      </div>

      {errorText && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs">
          {errorText}
        </div>
      )}
      {successText && (
        <div className="mb-4 p-3 bg-[#00C896]/10 border border-[#00C896]/20 text-[#00C896] rounded-lg text-xs">
          {successText}
        </div>
      )}

      {/* Main Account details panel on side if user is selected */}
      {selectedUser && !isNotifModalOpen && (
        <div className="mb-6 p-4 bg-slate-850 border border-slate-800 rounded-xl flex flex-col md:flex-row justify-between gap-4 relative">
          <button onClick={() => setSelectedUser(null)} className="absolute right-3 top-3 text-xs text-zinc-500 hover:text-zinc-200">Close</button>
          <div className="flex items-center gap-4">
            <img 
              src={selectedUser.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${selectedUser.username}`} 
              alt="Avatar" 
              className="w-16 h-16 rounded-xl border border-slate-700 bg-slate-900" 
              referrerPolicy="no-referrer"
            />
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                {selectedUser.username}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedUser.role === 'admin' ? 'bg-[#5865F2]/20 text-[#5865F2]' : 'bg-zinc-800 text-zinc-400'}`}>
                  {selectedUser.role.toUpperCase()}
                </span>
                {selectedUser.is_banned && <span className="text-[10px] uppercase font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">Suspended</span>}
              </h4>
              <p className="text-xs text-zinc-400 mt-1">E-mail: {selectedUser.email}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Clearence UUID: {selectedUser.id}</p>
            </div>
          </div>
          <div className="flex flex-col justify-end text-right text-xs gap-1.5 text-zinc-400">
            <div>Registration IP: <span className="font-mono text-zinc-300">{selectedUser.ip_address || '127.0.0.1'}</span></div>
            <div>Joined Context: {new Date(selectedUser.created_at).toLocaleString()}</div>
            <div>Last Online Hook: {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : 'Never'}</div>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-400 border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-zinc-300 font-semibold text-[11px] uppercase tracking-wider bg-slate-950/40">
              <th className="py-3 px-4">Full Details</th>
              <th className="py-3 px-4">Clearance Role</th>
              <th className="py-3 px-4">Access Status</th>
              <th className="py-3 px-4">IP Address</th>
              <th className="py-3 px-4">Join Date</th>
              <th className="py-3 px-4 text-right">Clearance Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-zinc-500">No active accounts match your search filters.</td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="border-b border-slate-850 hover:bg-slate-850/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={user.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.username}`} 
                        alt="Avatar" 
                        className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800" 
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="font-bold text-white hover:text-[#5865F2] cursor-pointer" onClick={() => setSelectedUser(user)}>
                          {user.username}
                        </div>
                        <div className="text-[10px] text-zinc-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${user.role === 'admin' ? 'bg-[#5865F2]/25 text-[#5865F2]' : 'bg-slate-950 border border-slate-800 text-zinc-400'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {user.is_banned ? (
                      <span className="text-[10px] font-bold tracking-wider uppercase text-red-500 bg-red-500/10 px-2 py-0.5 rounded">Suspended</span>
                    ) : (
                      <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">Clear/Active</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-300">{user.ip_address || '127.0.0.1'}</td>
                  <td className="py-3 px-4 text-zinc-500">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="p-2 bg-slate-850 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                        title="Inspect full context profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => notifyUserClick(user)}
                        className="px-2 py-1 bg-slate-850 hover:bg-slate-800 text-xs text-zinc-300 rounded hover:text-white"
                        title="Dispatcher specific message notice"
                      >
                        Alert
                      </button>
                      {user.role !== 'admin' && (
                        <>
                          {user.is_banned ? (
                            <button
                              onClick={() => handleUnban(user.id, user.username)}
                              className="p-2 text-[#00C896] hover:bg-[#00C896]/10 rounded-lg transition-colors"
                              title="Reactivate clearances"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBan(user.id, user.username)}
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Suspend clearances"
                            >
                              <ShieldX className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(user.id, user.username)}
                            className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Hard delete node context"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dispatch Custom Alert Modal */}
      {isNotifModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-55" id="notif-modal">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h4 className="text-base font-bold text-white mb-2 uppercase tracking-wide text-[#00C896]">Alert Dispatcher Control</h4>
            <p className="text-xs text-zinc-400 mb-4">You are transmitting a notification block to <span className="font-bold text-white">{selectedUser.username}</span>.</p>
            
            <form onSubmit={handleSendNotification}>
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1.5">Alert Header</label>
                <input
                  type="text"
                  value={notifTitle}
                  onChange={e => setNotifTitle(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 outline-none focus:border-[#5865F2] text-white"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1.5">Notification Body</label>
                <textarea
                  value={notifMessage}
                  required
                  onChange={e => setNotifMessage(e.target.value)}
                  rows={4}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 outline-none focus:border-[#5865F2] text-white resize-none"
                  placeholder="Insert notice explaining provisioning instructions, warnings, or special clearance codes."
                />
              </div>

              <div className="flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsNotifModalOpen(false)}
                  className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-zinc-400 font-medium rounded-lg"
                >
                  Abate Dispatch
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-[#5865F2] text-white font-medium hover:bg-[#4752C4] rounded-lg disabled:opacity-50"
                >
                  {isLoading ? 'Transmitting...' : 'Dispatch Alert Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
