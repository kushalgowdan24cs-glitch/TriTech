import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, 
  XAxis, YAxis, Tooltip, Legend, CartesianGrid 
} from 'recharts';
import { 
  BarChart3, Filter, Download, RefreshCw, CheckCircle2, 
  Clock, AlertTriangle, ShieldAlert, TrendingUp 
} from 'lucide-react';
import { api } from '../services/api';

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
const PRIORITY_COLORS = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#3b82f6',
  Low: '#64748b'
};

export function AnalyticsDashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState(null);

  // Filters State
  const [filters, setFilters] = useState({
    zone: 'all',
    category: 'all',
    priority: 'all',
    date_from: '',
    date_to: ''
  });

  const loadData = async (activeFilters = filters) => {
    try {
      setLoading(true);
      const [metaRes, analyticsRes] = await Promise.all([
        api.getMetadata(),
        api.getAnalytics(activeFilters)
      ]);
      if (metaRes) setMetadata(metaRes);
      if (analyticsRes.success) setAnalytics(analyticsRes);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFilterChange = (key, value) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    loadData(updated);
  };

  const handleResetFilters = () => {
    const reset = {
      zone: 'all',
      category: 'all',
      priority: 'all',
      date_from: '',
      date_to: ''
    };
    setFilters(reset);
    loadData(reset);
  };

  const summary = analytics?.summary || {
    total_reports: 0,
    resolved_reports: 0,
    unresolved_reports: 0,
    pending_reports: 0,
    resolution_rate: 0
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Module E
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Municipal Parking Enforcement Analytics &amp; SLA
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time multi-dimensional statistics, category distributions, and officer workload utilization.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(filters)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <a
            href="/api/export"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-md shadow-blue-600/30 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="my-6 bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Filter className="w-3.5 h-3.5 text-blue-400" />
          <span>Interactive Dimension Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Zone Filter */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Zone:</label>
            <select
              value={filters.zone}
              onChange={(e) => handleFilterChange('zone', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Enforcement Zones</option>
              {(metadata?.zones || []).map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Category:</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All 5 Violation Categories</option>
              {(metadata?.categories || []).map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Priority:</label>
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Priority Levels</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={handleResetFilters}
              className="w-full py-1.5 px-3 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Total Reports</span>
          <p className="text-2xl font-black font-mono text-white mt-1">{summary.total_reports}</p>
          <span className="text-[10px] text-slate-500">All recorded citations</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Resolved Cases</span>
          <p className="text-2xl font-black font-mono text-emerald-400 mt-1">{summary.resolved_reports}</p>
          <span className="text-[10px] text-emerald-500/80">{summary.resolution_rate}% Resolution Rate</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Active / Unresolved</span>
          <p className="text-2xl font-black font-mono text-amber-400 mt-1">{summary.unresolved_reports}</p>
          <span className="text-[10px] text-slate-500">In Progress &amp; Dispatched</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Pending Buffer</span>
          <p className="text-2xl font-black font-mono text-sky-400 mt-1">{summary.pending_reports}</p>
          <span className="text-[10px] text-slate-500">In validation / queue</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Active Critical</span>
          <p className="text-2xl font-black font-mono text-rose-400 mt-1">{summary.critical_active}</p>
          <span className="text-[10px] text-rose-400/80">Immediate attention</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART 1: Category Distribution (Pie Chart) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
            Violation Category Distribution (5 Categories)
          </h3>
          <p className="text-[11px] text-slate-500 mb-4">Breakdown across all 5 municipal violation classifications</p>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics?.category_distribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`}
                >
                  {(analytics?.category_distribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: Zone-wise Report Distribution (Bar Chart) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
            Zone-Wise Report Distribution
          </h3>
          <p className="text-[11px] text-slate-500 mb-4">Violation incident counts segmented by geographic territory</p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.zone_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="zone" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" name="Violations" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 3: Resolved vs Unresolved (Donut Chart) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
            Resolution Ratio (Resolved vs Active)
          </h3>
          <p className="text-[11px] text-slate-500 mb-4">Overall enforcement completion rate</p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics?.resolution_data || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: Handler Workload Comparison (Bar Chart) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
            Handler Workload &amp; Capacity Comparison
          </h3>
          <p className="text-[11px] text-slate-500 mb-4">Active case assignment load vs maximum handling threshold</p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.handler_workload || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="load" name="Current Load" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="capacity" name="Max Capacity" fill="#334155" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

