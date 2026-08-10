import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Eye, EyeOff, ShieldCheck, UserCheck, Lock, Mail, Phone, Sparkles } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in both Email and Password.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const result = login(email, password);
      setIsSubmitting(false);
      if (!result.success) {
        setError(result.message || 'Login failed.');
      }
    }, 400);
  };

  const fillAdmin = () => {
    setEmail('jabir.ahmed10@gmail.com');
    setPassword('Jaber@01780');
    setError(null);
  };

  const fillUser = () => {
    setEmail('jabir0753704086@gmail.com');
    setPassword('Masud@1780');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decorative Blur */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg mb-4 text-white">
            <Phone className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Masud Telecom
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Financial Transaction & Employee Commission Portal
          </p>
        </div>

        {/* Quick Credentials Switcher */}
        <div className="mb-6 bg-slate-900/80 border border-slate-700/60 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Demo Quick Login:
            </span>
            <span className="text-slate-500">Tap to auto-fill</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={fillAdmin}
              className="flex items-center justify-center gap-2 py-2 px-3 bg-blue-950/80 hover:bg-blue-900/80 border border-blue-700/50 rounded-lg text-xs text-blue-200 font-semibold transition-all text-left"
            >
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <div className="leading-tight">Admin Demo</div>
                <div className="text-[10px] opacity-75 font-mono">jabir.ahmed10</div>
              </div>
            </button>

            <button
              type="button"
              onClick={fillUser}
              className="flex items-center justify-center gap-2 py-2 px-3 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-700/50 rounded-lg text-xs text-emerald-200 font-semibold transition-all text-left"
            >
              <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="leading-tight">User Demo</div>
                <div className="text-[10px] opacity-75 font-mono">jabir0753704086</div>
              </div>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. jabir.ahmed10@gmail.com"
                required
                className="w-full bg-slate-900/90 border border-slate-700 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full bg-slate-900/90 border border-slate-700 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-700/60 text-center text-xs text-slate-400">
          Internal Secure Payment Gateway &bull; Masud Telecom
        </div>
      </div>
    </div>
  );
};
