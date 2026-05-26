/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Server, Zap, Shield, HardDrive, Cpu, Terminal, Users, CheckCircle2 } from 'lucide-react';

interface HomeHeroProps {
  onJoin: () => void;
  isAuthenticated: boolean;
  onDashboard: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({ onJoin, isAuthenticated, onDashboard }) => {
  return (
    <div className="text-zinc-100 font-sans" id="hdx-home-hero">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-6 max-w-7xl mx-auto">
        {/* Subtle decorative nodes */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#5865F2] opacity-10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-[#00C896] opacity-5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative text-center max-w-3xl mx-auto">
          {/* Tag badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700/80 text-xs font-medium text-[#00C896] mb-6">
            <Zap className="w-3.5 h-3.5 animate-pulse" />
            Empowering Developers Since 2026
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Claim Your Free <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5865F2] to-[#00C896]">
              High-Performance Server
            </span>
          </h1>
          
          <p className="text-zinc-400 text-lg sm:text-xl mb-10 leading-relaxed max-w-2xl mx-auto">
            Experience next-level hosting with HDX Cloud. Claim your free micro-KVM instance instantly, receive your secure 6-digit claim code, verify via Discord, and instantly launch.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated ? (
              <button
                onClick={onDashboard}
                id="hero-go-dashboard"
                className="w-full sm:w-auto px-8 py-3.5 bg-[#5865F2] hover:bg-[#4752C4] active:scale-95 text-white font-medium rounded-lg transition-all shadow-lg shadow-[#5865F2]/20 flex items-center justify-center gap-2"
              >
                Go to Dashboard
                <Server className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={onJoin}
                  id="hero-get-started"
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#5865F2] hover:bg-[#4752C4] active:scale-95 text-white font-medium rounded-lg transition-all shadow-lg shadow-[#5865F2]/20 flex items-center justify-center gap-2"
                >
                  Create Free Account
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <a
                  href="#features"
                  className="w-full sm:w-auto px-8 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-zinc-300 font-medium rounded-lg transition-all flex items-center justify-center"
                >
                  Explore Hardware
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Real-time stats ticker */}
      <section className="bg-slate-900 border-y border-slate-800 py-8 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div id="hero-stat-cpu">
            <div className="text-2xl sm:text-3xl font-extrabold text-white">AMD EPYC™</div>
            <div className="text-zinc-500 text-xs mt-1">High-Frequency Cores</div>
          </div>
          <div id="hero-stat-nvme">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#00C896]">100% NVMe</div>
            <div className="text-zinc-500 text-xs mt-1">PCIe Gen 4 SSD Storage</div>
          </div>
          <div id="hero-stat-users">
            <div className="text-2xl sm:text-3xl font-extrabold text-white">4,800+</div>
            <div className="text-zinc-500 text-xs mt-1">Servers Configured</div>
          </div>
          <div id="hero-stat-ping">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#5865F2]">99.9%</div>
            <div className="text-zinc-500 text-xs mt-1">Core SLA Guarantee</div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto scrolled-offset-section">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">Enterprise Architecture, Free of Cost</h2>
          <p className="text-zinc-400">Our free server tier is designed to help developers host scripts, bots, prototypes, and testing environments instantly.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="p-8 bg-slate-800 border border-slate-700/60 rounded-2xl hover:border-[#5865F2]/40 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-[#5865F2] flex items-center justify-center mb-6 border border-[#5865F2]/20 group-hover:scale-110 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Intel & AMD Hardware</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Backed by high-performance enterprise host machines. Run your application on rapid processing cores with optimized execution queues.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-8 bg-slate-800 border border-slate-700/60 rounded-2xl hover:border-[#00C896]/40 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-[#00C896]/10 text-[#00C896] flex items-center justify-center mb-6 border border-[#00C896]/20 group-hover:scale-110 transition-transform">
              <Terminal className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Dedicated IPv4/IPv6</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Every approved server comes with full port access, private firewall controls, and custom DNS options to bind your custom domains.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-8 bg-slate-800 border border-slate-700/60 rounded-2xl hover:border-[#5865F2]/40 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6 border border-purple-500/20 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Strict DDoS Shield</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Never worry about downtime. Our network is wrapped under tier-3 scrubbers that filter out massive volumetric DDoS traffic instantly.
            </p>
          </div>
        </div>
      </section>

      {/* Claim Guide Steps */}
      <section className="bg-slate-900/60 border-t border-slate-800 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white">How to Claim Your Free Server</h2>
            <p className="text-zinc-400 mt-2">Just three fast steps separating your project from enterprise hosting.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 hidden md:block pointer-events-none" />
            
            {/* Step 1 */}
            <div className="relative text-center bg-slate-800 p-6 rounded-xl border border-slate-700/60 z-10">
              <div className="w-10 h-10 rounded-full bg-[#5865F2] text-white flex items-center justify-center text-sm font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-bold text-white mb-2">Register Account</h3>
              <p className="text-sm text-zinc-400">
                Sign up with your credentials, or quickly log in via Google / Discord OAuth instantly.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center bg-slate-800 p-6 rounded-xl border border-slate-700/60 z-10">
              <div className="w-10 h-10 rounded-full bg-[#00C896] text-white flex items-center justify-center text-sm font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-bold text-white mb-2">Request Claim Code</h3>
              <p className="text-sm text-zinc-400">
                Click "Claim Free Server" on the dashboard to generate your unique 6-digit verification pin and submit the claim request.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative text-center bg-slate-800 p-6 rounded-xl border border-slate-700/60 z-10">
              <div className="w-10 h-10 rounded-full bg-[#5865F2] text-white flex items-center justify-center text-sm font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-bold text-white mb-2">Discord Deployment</h3>
              <p className="text-sm text-zinc-400">
                Once reviewed and approved by administrators, submit your code in the Discord server channel to unlock provisioning!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer info pages markup */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-zinc-500 text-xs">
          <div>
            &copy; 2026 HDX CLOUD. All rights reserved. Built for developers worldwide.
          </div>
          <div className="flex gap-6">
            <span className="hover:text-zinc-300 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-zinc-300 cursor-pointer">Terms of Service</span>
            <span className="hover:text-zinc-300 cursor-pointer">Security Protocol</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
