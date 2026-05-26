/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CheckCircle2, XCircle, Trash2, Search, Filter, AlertCircle, RefreshCw } from 'lucide-react';
import { Claim, ClaimStatus } from '../types.js';

interface AdminClaimsListProps {
  claims: Claim[];
  onApproveClaims: (ids: string[]) => Promise<void>;
  onRejectClaims: (ids: string[]) => Promise<void>;
  onDeleteClaim: (id: string) => Promise<void>;
}

type FilterStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export const AdminClaimsList: React.FC<AdminClaimsListProps> = ({
  claims,
  onApproveClaims,
  onRejectClaims,
  onDeleteClaim
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');

  // Filtering claims
  const filteredClaims = claims.filter(c => {
    // Search query matches code, email, username or IP
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      c.code.toLowerCase().includes(q) ||
      (c.username && c.username.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      c.ip_address.includes(q) ||
      c.id.includes(q);

    // Status matches
    const matchesStatus = statusFilter === 'ALL' || c.status.toUpperCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // Select only selectable/unprocessed (or pending) claims for bulk action to avoid re-approving
      const pendingIds = filteredClaims.filter(c => c.status === ClaimStatus.PENDING).map(c => c.id);
      setSelectedIds(pendingIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Bulk Approvals
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setIsLoading(true);
    setErrorText('');
    setSuccessText('');
    try {
      await onApproveClaims(selectedIds);
      setSuccessText(`Bulk Approved ${selectedIds.length} server requests successfully!`);
      setSelectedIds([]);
    } catch (err: any) {
      setErrorText(err.message || 'Bulk Approval failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk Rejections
  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    setIsLoading(true);
    setErrorText('');
    setSuccessText('');
    try {
      await onRejectClaims(selectedIds);
      setSuccessText(`Bulk Rejected ${selectedIds.length} server requests.`);
      setSelectedIds([]);
    } catch (err: any) {
      setErrorText(err.message || 'Bulk Rejection failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Single approval
  const handleSingleApprove = async (id: string, name: string) => {
    setIsLoading(true);
    setErrorText('');
    setSuccessText('');
    try {
      await onApproveClaims([id]);
      setSuccessText(`Approved request from user ${name}`);
    } catch (err: any) {
      setErrorText(err.message || 'Approval failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Single rejection
  const handleSingleReject = async (id: string, name: string) => {
    setIsLoading(true);
    setErrorText('');
    setSuccessText('');
    try {
      await onRejectClaims([id]);
      setSuccessText(`Rejected claim request from user ${name}`);
    } catch (err: any) {
      setErrorText(err.message || 'Rejection failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Claim delete
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this claim log from database? (The code will no longer be valid).')) {
      return;
    }
    setErrorText('');
    setSuccessText('');
    try {
      await onDeleteClaim(id);
      setSuccessText('Claim log removed successfully.');
    } catch (err: any) {
      setErrorText(err.message || 'Failed log deletion');
    }
  };

  const getStatusTextClasses = (s: ClaimStatus) => {
    switch (s) {
      case ClaimStatus.PENDING: return 'text-amber-500 bg-amber-500/10 border border-amber-500/15';
      case ClaimStatus.APPROVED: return 'text-[#00C896] bg-[#00C896]/10 border border-[#00C896]/15';
      case ClaimStatus.REJECTED: return 'text-red-400 bg-red-400/10 border border-red-400/15';
      case ClaimStatus.CANCELLED: return 'text-zinc-500 bg-zinc-900 border border-zinc-800';
      default: return 'text-zinc-400';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6" id="admin-claims-deck">
      {/* Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white uppercase tracking-wider text-sm text-[#5865F2]">KVM Server Claim Submissions</h3>
          <p className="text-xs text-zinc-400 mt-1">Review codes, check duplicate IPs, approve clearances to broadcast Discord Webhook payload records.</p>
        </div>

        {/* Filters/Search Row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Custom radio-looking pills */}
          <div className="flex bg-slate-950 p-1 border border-slate-850 rounded-lg text-xs font-medium text-zinc-400 select-none">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as FilterStatus[]).map((st) => (
              <button
                key={st}
                onClick={() => { setStatusFilter(st); setSelectedIds([]); }}
                className={`px-3 py-1.5 rounded-md transition-colors text-[10px] uppercase font-bold tracking-wide cursor-pointer ${statusFilter === st ? 'bg-[#5865F2] text-white' : 'hover:text-zinc-300'}`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search code, user, email, IP..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 text-xs py-2.5 bg-slate-950 border border-slate-800 rounded-lg outline-none text-white focus:border-[#5865F2]"
            />
          </div>
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

      {/* Bulk actions controls bar */}
      {selectedIds.length > 0 && (
        <div className="mb-4 p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
            <AlertCircle className="w-4 h-4 text-[#5865F2]" />
            Bulk queue: <span className="text-[#5865F2]">{selectedIds.length}</span> items chosen
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkApprove}
              disabled={isLoading}
              className="px-3.5 py-1.5 bg-[#00C896] hover:bg-[#00ad82] disabled:opacity-40 text-xs text-slate-950 font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve Clearances
            </button>
            <button
              onClick={handleBulkReject}
              disabled={isLoading}
              className="px-3.5 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-xs text-white font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject Clearances
            </button>
          </div>
        </div>
      )}

      {/* Claims list table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-400 border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-zinc-300 font-semibold text-[11px] uppercase tracking-wider bg-slate-950/40">
              <th className="py-3 px-4 w-12 text-center">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={
                    filteredClaims.length > 0 &&
                    filteredClaims.filter(c => c.status === ClaimStatus.PENDING).every(c => selectedIds.includes(c.id))
                  }
                  title="Choose all pending for bulk operation"
                  className="rounded border-slate-800 bg-slate-950 text-[#5865F2] focus:ring-[#5865F2]/20 cursor-pointer"
                />
              </th>
              <th className="py-3 px-4">Claim ID</th>
              <th className="py-3 px-4">Applicant Member</th>
              <th className="py-3 px-4">Pin Code</th>
              <th className="py-3 px-4">IP Address</th>
              <th className="py-3 px-4">Request Status</th>
              <th className="py-3 px-4">Submitted Date</th>
              <th className="py-3 px-4 text-right">Clearance Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClaims.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-zinc-500">No active server claim requests match your filters.</td>
              </tr>
            ) : (
              filteredClaims.map(claim => (
                <tr key={claim.id} className="border-b border-slate-850 hover:bg-slate-850/30 transition-colors">
                  <td className="py-3 px-4 text-center">
                    <input
                      type="checkbox"
                      disabled={claim.status !== ClaimStatus.PENDING}
                      checked={selectedIds.includes(claim.id)}
                      onChange={() => handleSelectRow(claim.id)}
                      className="rounded border-slate-800 bg-slate-950 text-[#5865F2] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    />
                  </td>
                  <td className="py-3 px-4 font-mono text-[10px] text-zinc-500">{claim.id}</td>
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-bold text-white">{claim.username || 'Unrecorded User'}</div>
                      <div className="text-[10px] text-zinc-500">{claim.email || 'System Database'}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-sm font-black tracking-wider text-zinc-100 bg-slate-950 py-1 px-2.5 rounded-md border border-slate-850">
                      {claim.code}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-300">{claim.ip_address}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-extrabold tracking-wide px-2.5 py-1 rounded-full uppercase ${getStatusTextClasses(claim.status)}`}>
                      {claim.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-500">{new Date(claim.created_at).toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {claim.status === ClaimStatus.PENDING && (
                        <>
                          <button
                            onClick={() => handleSingleApprove(claim.id, claim.username || 'User')}
                            disabled={isLoading}
                            className="p-1 px-2.5 bg-slate-850 hover:bg-[#00C896]/15 hover:text-[#00C896] text-[10px] uppercase font-bold text-zinc-300 rounded transition-colors"
                            title="Review Approval"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleSingleReject(claim.id, claim.username || 'User')}
                            disabled={isLoading}
                            className="p-1 px-2.5 bg-slate-850 hover:bg-red-500/15 hover:text-red-400 text-[10px] uppercase font-bold text-zinc-300 rounded transition-colors"
                            title="Reject Claim"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(claim.id)}
                        className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete log row record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
