import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ShieldCheck, AlertTriangle, FileText, UserCheck, 
  Share2, BarChart3, Cpu, Activity, Download, Sun, Moon
} from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../hooks/useTheme';

export function Navbar({ onCriticalCountUpdate }) {
  const { theme, toggleTheme, isDark } = useTheme();
  const [stats, setStats] = useState({ critical_active: 0 });
  const [isBackendHealthy, setIsBackendHealthy] = useState(true);

  useEffect(() => {
    const fetchHealthAndStats = async () => {
      try {
        const [health, statsData] = await Promise.all([
          api.getHealth(),
          api.getDashboardStats()
        ]);
        setIsBackendHealthy(health.status === 'healthy');
        if (statsData.success) {
          setStats(statsData);
          if (onCriticalCountUpdate) {
            onCriticalCountUpdate(statsData.critical_active || 0);
          }
        }
      } catch (err) {
        setIsBackendHealthy(false);
      }
    };

    fetchHealthAndStats();
    const interval = setInterval(fetchHealthAndStats, 8000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { to: '/', label: 'Submit Report', icon: FileText },
    { to: '/user', label: 'Citizen Tracker', icon: UserCheck },
    { to: '/handler', label: 'Handler Deck', icon: ShieldCheck },
    { to: '/routing', label: 'Routing & Dispatch', icon: Share2 },
    { to: '/analytics', label: 'Analytics & SLA', icon: BarChart3 },
    { to: '/dfa-simulator', label: 'DFA Engine', icon: Cpu },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 border-b border-slate-800 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-white text-lg">
                  PARK<span className="text-blue-500">GUARD</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  GOV 2.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wide font-medium hidden sm:block">
                Intelligent Parking Violation Management System
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Status Badges & Quick Action */}
          <div className="flex items-center gap-2.5">
            {/* Theme Change Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 transition cursor-pointer shadow-sm"
              title={isDark ? "Switch to Light Theme (White & Blue/Black)" : "Switch to Dark Navy Theme"}
              aria-label="Toggle Theme"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="text-slate-300 text-[11px] font-medium hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-slate-800 text-[11px] font-semibold hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            {/* Critical Alert Counter */}
            {stats.critical_active > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/40 text-red-400 text-xs font-semibold animate-pulse shadow-sm shadow-red-500/20">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{stats.critical_active} Critical Active</span>
                <span className="sm:hidden">{stats.critical_active}</span>
              </div>
            )}

            {/* Health Indicator */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
              <span className={`w-2 h-2 rounded-full ${isBackendHealthy ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
              <span className="text-slate-400">Engine:</span>
              <span className={isBackendHealthy ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                {isBackendHealthy ? 'Flask + SQLite' : 'Offline'}
              </span>
            </div>

            {/* Export CSV Button */}
            <a
              href="/api/export"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Download official records in CSV format"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export CSV</span>
            </a>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="md:hidden flex items-center justify-between overflow-x-auto py-2.5 border-t border-slate-800/80 gap-1 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </header>
  );
}
