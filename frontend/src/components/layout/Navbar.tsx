import React from 'react';
import { useAuth, DEMO_CREDENTIALS } from '../../context/AuthContext';
import type { UserRole } from '../../types';
import { LogOut, UserCircle, Bell, ArrowRightLeft } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, quickLogin } = useAuth();

  const roleColors: Record<UserRole, string> = {
    ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
    MERCHANDISER: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    SUPERVISOR: 'bg-blue-100 text-blue-800 border-blue-200',
    BUYER: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-xs">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm tracking-tighter">
            KT
          </div>
          <div>
            <span className="font-bold text-base text-slate-900 tracking-tight">KnitTrack</span>
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              Tiruppur Exporter
            </span>
          </div>
        </div>

        {/* Demo Role Switcher & User Profile */}
        <div className="flex items-center gap-4">
          {/* Quick Demo Switcher Dropdown */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <span className="flex items-center gap-1 px-2 font-medium text-slate-400">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Demo:
            </span>
            {(['MERCHANDISER', 'SUPERVISOR', 'BUYER', 'ADMIN'] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => quickLogin(r)}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                  user?.role === r
                    ? 'bg-white text-indigo-600 shadow-xs border border-slate-200'
                    : 'hover:bg-slate-200/60 text-slate-600'
                }`}
              >
                {r === 'MERCHANDISER'
                  ? 'Merchandiser'
                  : r === 'SUPERVISOR'
                  ? 'Supervisor'
                  : r === 'BUYER'
                  ? 'Buyer'
                  : 'Admin'}
              </button>
            ))}
          </div>

          {/* User Details */}
          {user && (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-800">{user.name}</div>
                <div className="flex items-center justify-end gap-1.5">
                  <span
                    className={`inline-block text-[10px] font-semibold px-2 py-0.2 rounded border ${
                      roleColors[user.role] || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {user.role}
                  </span>
                  {user.productionUnit && (
                    <span className="text-[10px] text-slate-400">
                      • {user.productionUnit.name.split('-')[0]}
                    </span>
                  )}
                  {user.buyer && (
                    <span className="text-[10px] text-slate-400">• {user.buyer.name}</span>
                  )}
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
