/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Server, Sparkles, AlertTriangle, CheckCircle, Clock, XCircle, Copy, Check, ArrowRight } from 'lucide-react';
import { Claim, ClaimStatus } from '../types.js';

interface ClaimCardProps {
  claim: Claim | null;
  onClaimCreate: () => Promise<void>;
  onClaimCancel: () => Promise<void>;
  discordInvite: string;
}

export const ClaimCard: React.FC<ClaimCardProps> = ({ claim, onClaimCreate, onClaimCancel, discordInvite }) => {
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleCopyCode = () => {
    if (claim) {
      navigator.clipboard.writeText(claim.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClaim = async () => {
    setIsLoading(true);
    setErrorText('');
    try {
      await onClaimCreate();
    } catch (err: any) {
      setErrorText(err.message || 'Failed to submit claim');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you absolutely sure you want to cancel this server claim request?')) {
      return;
    }
    setIsLoading(true);
    setErrorText('');
    try {
      await onClaimCancel();
    } catch (err: any) {
      setErrorText(err.message || 'Failed to cancel claim');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case ClaimStatus.PENDING:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
            Pending Admin Review
          </span>
        );
      case ClaimStatus.APPROVED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/20">
            <CheckCircle className="w-3.5 h-3.5" />
            Approved
          </span>
        );
      case ClaimStatus.REJECTED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </span>
        );
      case ClaimStatus.CANCELLED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#1E293B] border border-[#334155] p-8 rounded-3xl shadow-2xl relative h-full flex flex-col justify-between" id="dashboard-claim-card">
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <Server className="w-4 h-4 text-[#5865F2]" />
            Free KVM Server Claim Node
          </h3>
          {claim && claim.status !== ClaimStatus.CANCELLED && renderStatusBadge(claim.status)}
        </div>

        {errorText && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
            {errorText}
          </div>
        )}

        {!claim || claim.status === ClaimStatus.CANCELLED ? (
          /* Empty Claim state - Trigger claim */
          <div className="text-center py-8" id="claim-request-container">
            <div className="w-16 h-16 rounded-full bg-[#5865F2]/10 text-[#5865F2] flex items-center justify-center mx-auto mb-5 border border-[#5865F2]/15">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="text-base font-bold text-white mb-2">Claim Your Cloud KVM Instance</h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-6 leading-relaxed">
              Every user is entitled to exactly one high-performance virtual machine free of charge. Click below to generate your unique 6-digit claim code.
            </p>

            <button
              onClick={handleClaim}
              disabled={isLoading}
              id="claim-server-action-btn"
              className="px-6 py-3 bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-slate-800 disabled:text-zinc-600 rounded-xl text-xs tracking-wider uppercase font-extrabold text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              {isLoading ? 'Generating Context Node...' : 'Claim Free Server'}
            </button>
          </div>
        ) : (
          /* Active claim exists */
          <div id="active-claim-display">
            <div className="py-6 text-center select-none bg-slate-950/40 border border-slate-800/80 rounded-2xl mb-6">
              <p className="text-zinc-500 text-xs tracking-wider uppercase font-bold mb-1">Your 6-Digit Claim Code</p>
              <div className="flex items-center justify-center gap-4 my-2">
                <span 
                  className="text-4xl sm:text-5xl md:text-6xl font-black font-mono tracking-[10px] text-white" 
                  id="claim-code-text"
                  style={{ textShadow: '0 0 25px rgba(88,101,242,0.45)' }}
                >
                  {claim.code}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-2.5 bg-[#1E293B] hover:bg-slate-800 border border-[#334155] rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer shadow-lg"
                  title="Copy claim code to clipboard"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">Anchor IP Logged: {claim.ip_address}</p>
            </div>

            {claim.status === ClaimStatus.PENDING && (
              <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl mb-6 flex gap-3 text-amber-500">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold">Pending Approval:</span> Our security and server provision system is analyzing your registration. IP address logs are checked to prevent duplicate system allocations. Reviews usually complete under 24 hours.
                </div>
              </div>
            )}

            {claim.status === ClaimStatus.APPROVED && (
              <div className="p-5 bg-[#00C896]/5 border border-[#00C896]/10 rounded-2xl mb-6">
                <h5 className="text-sm font-bold text-[#00C896] mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 animate-bounce" />
                  Your Server is Ready to Provision!
                </h5>
                <p className="text-xs text-zinc-300 leading-normal mb-4">
                  Your server request has been approved. Please join our Discord server and use your unique code <span className="font-mono text-[#00C896] font-bold">{claim.code}</span> in the <span className="text-zinc-100 font-semibold">#claim-here</span> channel on Discord to instantly spawn your KVM terminal.
                </p>
                
                <a
                  href={discordInvite}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-xs font-semibold rounded-lg text-white transition-colors"
                >
                  Join Discord Workspace
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {claim.status === ClaimStatus.REJECTED && (
              <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl mb-6 flex gap-3 text-red-400">
                <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold">Claim Request Rejected:</span> Our automatic filters flagged this account as a potential multi-account bypass or invalid context. Submit support requests in our Discord room if this is an error.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cancel button fallback at the very bottom */}
      {claim && claim.status !== ClaimStatus.CANCELLED && claim.status !== ClaimStatus.APPROVED && (
        <div className="text-right mt-4 pt-4 border-t border-slate-800/60">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="text-xs text-zinc-500 hover:text-red-400 font-semibold transition-colors cursor-pointer"
          >
            {isLoading ? 'Cancelling...' : 'Cancel Server Request'}
          </button>
        </div>
      )}
    </div>
  );
};
