import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  PlusCircle,
  Smartphone,
  Eye,
  FileSpreadsheet,
  AlertCircle,
  Building2,
  CalendarCheck2,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const isMerch = user.role === 'MERCHANDISER' || user.role === 'ADMIN';
  const isSupervisor = user.role === 'SUPERVISOR' || user.role === 'ADMIN';
  const isBuyer = user.role === 'BUYER';

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-57px)]">
      <div className="p-4 space-y-6 flex-1">
        {/* Navigation Sections */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3">
            Main Navigation
          </span>
          <div className="mt-2 space-y-1">
            {!isBuyer && (
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                Production Board
              </NavLink>
            )}

            {isBuyer && (
              <NavLink
                to="/buyer"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <Eye className="w-4 h-4" />
                Buyer Portal
              </NavLink>
            )}

            {isMerch && (
              <NavLink
                to="/orders/new"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <PlusCircle className="w-4 h-4" />
                Create New Order
              </NavLink>
            )}

            {isSupervisor && (
              <NavLink
                to="/supervisor/update"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                <Smartphone className="w-4 h-4" />
                Supervisor Floor Update
              </NavLink>
            )}
          </div>
        </div>

        {/* Tiruppur Factory Context */}
        <div className="pt-4 border-t border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3">
            Factory Units
          </span>
          <div className="mt-2 space-y-1 text-xs text-slate-400 px-3">
            <div className="flex items-center gap-2 py-1 text-slate-400">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Unit 1: Angeripalayam (Main)</span>
            </div>
            <div className="flex items-center gap-2 py-1 text-slate-400">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Unit 2: Kangeyam Road</span>
            </div>
            <div className="flex items-center gap-2 py-1 text-slate-400">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Unit 3: Palladam Hi-Tech</span>
            </div>
          </div>
        </div>

        {/* AI & Automation Status */}
        <div className="pt-4 border-t border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3">
            AI Assistant
          </span>
          <div className="mt-2 px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Tamil NLP Classifier
            </div>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
              Real-time classification of Tamil floor notes into standard export issue categories.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500">
        <div>KnitTrack Production MVP</div>
        <div>Isocode Labs Assessment 2026</div>
      </div>
    </aside>
  );
};
