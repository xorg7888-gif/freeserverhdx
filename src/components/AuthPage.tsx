/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, ChevronRight, Eye, EyeOff } from 'lucide-react';

interface AuthPageProps {
  onAuthSuccess: (token: string, user: any) => void;
  onBackToHome: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess, onBackToHome }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form
  const [username, setUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // State variables for feedback/alerts
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password email
  const [forgotEmail, setForgotEmail] = useState('');

  // OAuth popup handler
  const triggerOAuth = async (provider: 'google' | 'discord') => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/auth/oauth-url?provider=${provider}&origin=${encodeURIComponent(window.location.origin)}`);
      if (!response.ok) throw new Error(`Failed to configure ${provider} authentication`);
      
      const { url } = await response.json();
      
      // Let's open popup window. Note: iframe sandbox popups are perfectly supported.
      const authWindow = window.open(
        url,
        'hdx_oauth_popup',
        'width=600,height=700,status=no,resizable=yes,scrollbars=yes'
      );

      if (!authWindow) {
        setErrorMessage('Popup blocker detected. Please allow popups for HDX Cloud in your browser address bar.');
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'OAuth init failed');
      setIsLoading(false);
    }
  };

  // Add listener for popup messages
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      // Security check
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost') && !event.origin.includes('127.0.0.1')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { token, user } = event.data;
        setSuccessMessage(`Welcome back, ${user.username}!`);
        setIsLoading(false);
        setTimeout(() => {
          onAuthSuccess(token, user);
        }, 800);
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setErrorMessage(event.data.error || 'Authentication aborted');
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onAuthSuccess]);

  // Standard Login submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!loginEmail || !loginPassword) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setSuccessMessage('Logged in successfully! Loading terminal...');
      setTimeout(() => {
        onAuthSuccess(data.token, data.user);
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  // Standard Register submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!username || !registerEmail || !registerPassword || !confirmPassword) {
      setErrorMessage('All parameters must be supplied.');
      return;
    }

    if (registerPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    // Client-side rule verification
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(registerPassword)) {
      setErrorMessage('Password must be at least 8 characters long, contain an uppercase letter, and a number.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          email: registerEmail,
          password: registerPassword,
          confirmPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccessMessage('Account provisioned successfully!');
      setTimeout(() => {
        onAuthSuccess(data.token, data.user);
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Email is already registered or username taken.');
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password handler
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!forgotEmail) {
      setErrorMessage('Please type an email address.');
      return;
    }
    setSuccessMessage(`Instructions to reset password have been dispatched to ${forgotEmail}. (Simulated dispatch success)`);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-slate-950 text-slate-100 font-sans" id="hdx-auth-page">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800/80 p-8 rounded-2xl shadow-xl hover:border-slate-800 transition-all">
        {/* Dynamic Logo Text */}
        <div className="text-center mb-8">
          <div onClick={onBackToHome} className="inline-block text-2xl font-extrabold tracking-tight text-white select-none cursor-pointer">
            HDX <span className="text-[#5865F2]">CLOUD</span>
          </div>
          <p className="text-zinc-500 text-xs mt-1 uppercase tracking-wider">Free Server Provisioning</p>
        </div>

        {/* Action feedback */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center" id="auth-error-banner">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-[#00C896]/10 border border-[#00C896]/20 text-[#00C896] text-xs text-center" id="auth-success-banner">
            {successMessage}
          </div>
        )}

        {isForgotPassword ? (
          /* Forgot Password Interface */
          <form onSubmit={handleForgotSubmit} id="forgot-password-form">
            <h3 className="text-base font-bold text-white mb-2">Reset password</h3>
            <p className="text-xs text-zinc-400 mb-4 leading-normal">
              Provide your account's email address and we'll dispatch manual instructions to reset your private passkeys.
            </p>
            <div className="mb-4 relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                placeholder="Enter email address"
                required
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                className="w-full py-2.5 pl-10 pr-4 bg-slate-950 border border-slate-800 focus:border-[#5865F2] outline-none text-sm rounded-lg transition-colors"
              />
            </div>
            
            <button
              type="submit"
              className="w-full py-2.5 bg-[#5865F2] text-sm text-white font-medium rounded-lg hover:bg-[#4752C4] transition-colors"
            >
              Dispatch Reset Request
            </button>
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Return to Login
              </button>
            </div>
          </form>
        ) : isLogin ? (
          /* Login Mode */
          <div id="login-container">
            <form onSubmit={handleLoginSubmit} id="login-form">
              <div className="mb-4 relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  className="w-full py-3.5 pl-10 pr-4 bg-slate-950 border border-slate-800 focus:border-[#5865F2] outline-none text-sm rounded-lg transition-colors focus:ring-1 focus:ring-[#5865F2]/20"
                />
              </div>

              <div className="mb-4 relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  required
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full py-3.5 pl-10 pr-10 bg-slate-950 border border-slate-800 focus:border-[#5865F2] outline-none text-sm rounded-lg transition-colors focus:ring-1 focus:ring-[#5865F2]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="text-right mb-4">
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                id="login-btn-submit"
                className="w-full py-3 bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-slate-800 disabled:text-zinc-600 disabled:cursor-not-allowed font-medium text-xs tracking-wider uppercase text-white rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                {isLoading ? 'Processing Secure Portal...' : 'Open Control Deck'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center mt-6 text-xs text-zinc-500">
              Don't have an account?{' '}
              <button
                onClick={() => {
                  setIsLogin(false);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="text-[#00C896] hover:underline font-semibold"
              >
                Register Here
              </button>
            </div>
          </div>
        ) : (
          /* Register Mode */
          <div id="register-container">
            <form onSubmit={handleRegisterSubmit} id="register-form">
              <div className="mb-4 relative">
                <User className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Username"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full py-3.5 pl-10 pr-4 bg-slate-950 border border-slate-800 focus:border-[#5865F2] outline-none text-sm rounded-lg transition-colors"
                />
              </div>

              <div className="mb-4 relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  value={registerEmail}
                  onChange={e => setRegisterEmail(e.target.value)}
                  className="w-full py-3.5 pl-10 pr-4 bg-slate-950 border border-slate-800 focus:border-[#5865F2] outline-none text-sm rounded-lg transition-colors"
                />
              </div>

              <div className="mb-4 relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password (Min 8 chars, 1 uppercase, 1 number)"
                  required
                  value={registerPassword}
                  onChange={e => setRegisterPassword(e.target.value)}
                  className="w-full py-3.5 pl-10 pr-4 bg-slate-950 border border-slate-800 focus:border-[#5865F2] outline-none text-sm rounded-lg transition-colors"
                />
              </div>

              <div className="mb-6 relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full py-3.5 pl-10 pr-4 bg-slate-950 border border-slate-800 focus:border-[#5865F2] outline-none text-sm rounded-lg transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                id="register-btn-submit"
                className="w-full py-3 bg-[#00C896] hover:bg-[#00ad82] disabled:bg-slate-800 disabled:text-zinc-600 disabled:cursor-not-allowed font-medium text-xs tracking-wider uppercase text-slate-950 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                {isLoading ? 'Creating Core Context...' : 'Register Control Node'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-center mt-6 text-xs text-zinc-500">
              Already have an account?{' '}
              <button
                onClick={() => {
                  setIsLogin(true);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="text-[#5865F2] hover:underline font-semibold"
              >
                Log In
              </button>
            </div>
          </div>
        )}

        {/* OAuth Buttons (Google + Discord) */}
        {!isForgotPassword && (
          <div className="mt-8 pt-8 border-t border-slate-800/60" id="oauth-selections">
            <div className="relative flex justify-center text-xs mb-4 uppercase">
              <span className="bg-slate-900 px-3 text-zinc-500 tracking-wider">Secure OAuth login option</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Discord Button */}
              <button
                type="button"
                onClick={() => triggerOAuth('discord')}
                className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] hover:shadow-[#5865F2]/15 hover:shadow-lg transition-all text-xs font-semibold rounded-lg text-white flex items-center justify-center gap-2 cursor-pointer"
              >
                {/* Custom inline Discord vector */}
                <svg className="w-4 h-4 fill-white" viewBox="0 0 127.14 96.36">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,52.48,6.83,77.19,77.19,0,0,0,49.18,0,105.15,105.15,0,0,0,18.74,8.07C-3.41,40.93-1.07,72.9,1.43,77.53a105.6,105.6,0,0,0,32.44,16.36,80.7,80.7,0,0,0,6.83-11.08,68.43,68.43,0,0,1-10.85-5.18c.92-.67,1.81-1.37,2.65-2.1a75.48,75.48,0,0,0,69.58,0c.84.73,1.73,1.43,2.65,2.1a68.43,68.43,0,0,1-10.85,5.18,80.7,80.7,0,0,0,6.83,11.08,105.6,105.6,0,0,0,32.44-16.36C128.21,72.9,130.55,40.93,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.42,65.69,73.24,60,73.24,53S78.42,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
                </svg>
                Discord
              </button>

              {/* Google Button */}
              <button
                type="button"
                onClick={() => triggerOAuth('google')}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 hover:shadow-white/5 hover:shadow-lg border border-slate-800 transition-all text-xs font-semibold rounded-lg text-white flex items-center justify-center gap-2 cursor-pointer"
              >
                {/* Custom inline Google vector */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Google
              </button>
            </div>
            
            <p className="text-zinc-600 text-[9px] text-center mt-3 leading-normal">
              No developer configuration setup required. OAuth runs in a simulated development sandbox by default when no CLIENT_ID is present in the environment block.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
