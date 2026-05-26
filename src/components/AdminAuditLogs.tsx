/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Terminal, Shield, Search, Calendar } from 'lucide-react';
import { AuditLog } from '../types.js';

interface AdminAuditLogsProps {
  logs: AuditLog[];
}

export const AdminAuditLogs: React.FC<AdminAuditLogsProps> = ({ logs }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering audit logs
  const filteredLogs = logs.filter(log => {
    const q = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      (log.admin_username && log.admin_username.toLowerCase().includes(q)) ||
      (log.target_user && log.target_user.toLowerCase().includes(q)) ||
      (log.ip && log.ip.includes(q))
    );
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6" id="admin-audits-deck">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white uppercase tracking-wider text-sm text-red-400 flex items-center gap-1.5">
            <Terminal className="w-5 h-5 text-red-500" />
            Security Audit Logs Record
          </h3>
          <p className="text-xs text-zinc-400 mt-1">Immutably stored chronicle of administrator actions, clearance approvals, and suspensions.</p>
        </div>

        {/* Search audits */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search action, admin, target..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg outline-none text-white focus:border-[#5865F2]"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-400 border-collapse">
          <thead>
            <tr className="border-b border-slate-850 text-zinc-300 font-semibold text-[11px] uppercase tracking-wider bg-slate-950/40">
              <th className="py-3 px-4">Operator</th>
              <th className="py-3 px-4">Action Description</th>
              <th className="py-3 px-4">Target Node</th>
              <th className="py-3 px-4">Operator IP</th>
              <th className="py-3 px-4 text-right">Chronology Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-zinc-500 font-mono">NO COMPLETED AUDIT ENTRIES DETECTED.</td>
              </tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id} className="border-b border-slate-850 font-mono text-[11px] hover:bg-slate-850/20">
                  <td className="py-3.5 px-4 text-zinc-200 font-bold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-red-500" />
                    {log.admin_username || 'Admin'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-amber-500 font-bold">{log.action}</span>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300">
                    {log.target_user || 'System Node'}
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400">{log.ip}</td>
                  <td className="py-3.5 px-4 text-right text-zinc-550 flex items-center justify-end gap-1">
                    <Calendar className="w-3 h-3 text-zinc-650" />
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
