/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Settings, Save, HelpCircle, Check, Info } from 'lucide-react';
import { AppSettings } from '../types.js';

interface AdminSettingsProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ settings, onSaveSettings }) => {
  const [discordInvite, setDiscordInvite] = useState(settings.discord_invite);
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(settings.discord_webhook_url);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorText, setErrorText] = useState('');

  // Sync state if settings prop changes (e.g. on initial DB fetch return)
  useEffect(() => {
    setDiscordInvite(settings.discord_invite);
    setDiscordWebhookUrl(settings.discord_webhook_url);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccess(false);
    setErrorText('');

    try {
      await onSaveSettings({
        discord_invite: discordInvite,
        discord_webhook_url: discordWebhookUrl
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setErrorText(err.message || 'Failed to save system settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6" id="admin-settings-deck">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-[#5865F2]" />
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider text-xs">System & Discord Integrations</h3>
          <p className="text-[11px] text-zinc-500">Configure parameters for broadcasting server claims, webhooks, and redirect endpoints.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errorText && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs">
            {errorText}
          </div>
        )}
        {success && (
          <div className="p-3 bg-[#00C896]/10 border border-[#00C896]/20 text-[#00C896] rounded-lg text-xs flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            Platform configurations synchronized successfully. Audit log emitted.
          </div>
        )}

        {/* Discord Server Invite */}
        <div id="settings-invite-group">
          <label className="block text-zinc-300 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
            Discord Invitation URL
            <HelpCircle className="w-3.5 h-3.5 text-zinc-500" title="The invitation link provided to active server claimants so they can join your Guild." />
          </label>
          <input
            type="url"
            value={discordInvite}
            onChange={e => setDiscordInvite(e.target.value)}
            className="w-full text-xs p-3 bg-slate-950 border border-slate-800 text-zinc-200 focus:border-[#5865F2] outline-none rounded-lg transition-colors"
            placeholder="e.g., https://discord.gg/yourserver"
            required
          />
          <p className="text-[10px] text-zinc-500 mt-1.5">This URL is injected into approved claims dashboards dynamically.</p>
        </div>

        {/* Discord Webhook URL */}
        <div id="settings-webhook-group">
          <label className="block text-zinc-300 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
            Discord Webhook Integration URI
            <HelpCircle className="w-3.5 h-3.5 text-zinc-500" title="The URL generated inside your Discord Server channel settings for webhook callbacks." />
          </label>
          <input
            type="password"
            value={discordWebhookUrl}
            onChange={e => setDiscordWebhookUrl(e.target.value)}
            className="w-full text-xs p-3 bg-slate-950 border border-slate-800 text-zinc-200 focus:border-[#5865F2] outline-none rounded-lg transition-colors tracking-wide font-mono"
            placeholder="https://discord.com/api/webhooks/..."
          />
          <p className="text-[10px] text-zinc-500 mt-1.5">
            When set, any member KVM claim approval broadcasts a full payload Rich Embed directly to this discord channel. Leaves empty to disable webhook dispatch.
          </p>
        </div>

        {/* Integration Instructions Alert */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex gap-3 text-zinc-400 text-xs">
          <Info className="w-5 h-5 text-[#5865F2] flex-shrink-0" />
          <div className="space-y-1">
            <span className="font-bold text-white block">Payload Embed Structure emitted to Webhook:</span>
            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded font-mono text-[10px] text-zinc-500">
              Approved Member: {"{username}"}<br />
              Claim Code: {"{code}"}<br />
              Server Invite: {"{discord_invite}"}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-right">
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-slate-800 disabled:text-zinc-650 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 select-none ml-auto cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'Synchronizing settings...' : 'Commit Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
