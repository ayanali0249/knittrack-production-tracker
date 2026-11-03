import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import type { UserRole } from '../types';
import { LogIn, ArrowRight, ShieldCheck, Factory, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, quickLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials. Please verify your login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (role: UserRole) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await quickLogin(role);
      if (role === 'BUYER') {
        navigate('/buyer');
      } else if (role === 'SUPERVISOR') {
        navigate('/supervisor/update');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Quick login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white font-black text-xl shadow-md mb-4">
          KT
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          KnitTrack Enterprise
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Production Order Tracking System • Tiruppur Knitwear Exporter
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="merch@knittrack.com"
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm shadow-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-xs text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              {isSubmitting ? 'Authenticating...' : 'Sign in to Account'}
            </button>
          </form>

          {/* Quick Demo Accounts Selection */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-3">
              1-Click Demo Accounts (Seeded)
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('MERCHANDISER')}
                className="p-2.5 text-left border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 rounded-lg transition-all group"
              >
                <div className="text-[11px] font-bold text-slate-800 group-hover:text-indigo-700">
                  Merchandiser
                </div>
                <div className="text-[10px] text-slate-500">Priya (Orders & TNA)</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('SUPERVISOR')}
                className="p-2.5 text-left border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 rounded-lg transition-all group"
              >
                <div className="text-[11px] font-bold text-slate-800 group-hover:text-blue-700">
                  Supervisor
                </div>
                <div className="text-[10px] text-slate-500">Murugan (Unit 1 Floor)</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('BUYER')}
                className="p-2.5 text-left border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 rounded-lg transition-all group"
              >
                <div className="text-[11px] font-bold text-slate-800 group-hover:text-emerald-700">
                  Buyer (UK)
                </div>
                <div className="text-[10px] text-slate-500">Company B (Read-Only)</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('ADMIN')}
                className="p-2.5 text-left border border-slate-200 hover:border-purple-500 hover:bg-purple-50/40 rounded-lg transition-all group"
              >
                <div className="text-[11px] font-bold text-slate-800 group-hover:text-purple-700">
                  Admin
                </div>
                <div className="text-[10px] text-slate-500">System Administrator</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security and Assessment Notice */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Role-Based Access Control • HttpOnly Cookies • bcrypt</span>
        </div>
      </div>
    </div>
  );
};
