import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, ShieldAlert, CheckCircle2, Clock, AlertTriangle, 
  Car, MapPin, User, FileText, ChevronRight, RefreshCw, Eye
} from 'lucide-react';
import { api } from '../services/api';
import { PriorityBadge, StatusBadge } from '../components/Badge';
import { StatusTimeline } from '../components/StatusTimeline';

export function UserDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [stats, setStats] = useState({
    total_reports: 0,
    pending_reports: 0,
    assigned_reports: 0,
    resolved_reports: 0
  });

  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedReportDetails, setSelectedReportDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Load summary stats and reports
  const loadData = async (query = '') => {
    try {
      setLoading(true);
      const [statsRes, reportsRes] = await Promise.all([
        api.getDashboardStats(),
        api.getReports({ search: query })
      ]);

      if (statsRes.success) setStats(statsRes);
      if (reportsRes.success) {
        setReports(reportsRes.reports);
        // If search returned reports and none selected, auto-select the first
        if (reportsRes.reports.length > 0) {
          handleSelectReport(reportsRes.reports[0].report_id);
        } else {
          setSelectedReport(null);
          setSelectedReportDetails(null);
        }
      }
    } catch (err) {
      console.error('Error fetching citizen dashboard data:', err);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  useEffect(() => {
    loadData(initialSearch);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearching(true);
    setSearchParams(searchQuery ? { search: searchQuery } : {});
    loadData(searchQuery);
  };

  const handleSelectReport = async (reportId) => {
    try {
      const res = await api.getReportDetails(reportId);
      if (res.success) {
        setSelectedReport(res.report);
        setSelectedReportDetails(res);
      }
    } catch (err) {
      console.error('Failed to load report details:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Module B
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Citizen Tracking &amp; Transparency Portal
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Track parking violation reports in real time with end-to-end municipal enforcement milestones.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Report ID, Plate, Citizen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow-md shadow-blue-600/30 cursor-pointer"
          >
            {searching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
          </button>
        </form>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Reports</span>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2 font-mono">{stats.total_reports}</p>
          <span className="text-[10px] text-slate-400">Logged on municipal ledger</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pending / Queued</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2 font-mono">{stats.pending_reports}</p>
          <span className="text-[10px] text-slate-400">Awaiting officer allocation</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Assigned / In Progress</span>
            <AlertTriangle className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-sky-400 mt-2 font-mono">{stats.assigned_reports}</p>
          <span className="text-[10px] text-slate-400">Enforcement officers dispatched</span>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Resolved Violations</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2 font-mono">{stats.resolved_reports}</p>
          <span className="text-[10px] text-slate-400">Enforced &amp; citation closed</span>
        </div>
      </div>

      {/* Main Content: Left List + Right Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Reports List */}
        <div className="lg:col-span-5 bg-slate-900/70 rounded-xl border border-slate-800 p-4 flex flex-col h-[650px]">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Submitted Reports ({reports.length})
            </h3>
            <button
              onClick={() => loadData(searchQuery)}
              className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>

          <div className="overflow-y-auto space-y-2 pr-1 flex-1">
            {reports.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No reports matched your search criteria.
              </div>
            ) : (
              reports.map((r) => {
                const isSelected = selectedReport && selectedReport.report_id === r.report_id;
                return (
                  <div
                    key={r.report_id}
                    onClick={() => handleSelectReport(r.report_id)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500/50 shadow-md ring-1 ring-blue-500/30'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-white text-xs">
                        {r.report_id}
                      </span>
                      <PriorityBadge priority={r.priority} />
                    </div>

                    <div className="flex items-center justify-between text-slate-400 text-[11px] mb-2">
                      <span className="font-mono text-slate-300">{r.vehicle_number}</span>
                      <span>{r.zone.split(' - ')[0]}</span>
                    </div>

                    <p className="text-[11px] text-slate-300 line-clamp-1 mb-2">
                      {r.description}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px]">
                      <StatusBadge status={r.status} />
                      <span className="text-slate-400">
                        {new Date(r.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Pane with Status Timeline */}
        <div className="lg:col-span-7 space-y-6">
          {selectedReport ? (
            <>
              {/* Selected Report Header Card */}
              <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-mono font-bold text-blue-400">
                      INCIDENT REPORT DETAILS
                    </span>
                    <h2 className="text-2xl font-black text-white font-mono mt-0.5">
                      {selectedReport.report_id}
                    </h2>
                    <span className="text-xs text-slate-400">
                      Logged at: {new Date(selectedReport.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={selectedReport.priority} size="lg" />
                    <StatusBadge status={selectedReport.status} size="lg" />
                  </div>
                </div>

                {/* VISUAL STATUS TIMELINE */}
                <div className="mt-6">
                  <StatusTimeline 
                    currentStatus={selectedReport.status} 
                    history={selectedReportDetails?.status_history || []} 
                  />
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-xs">
                  <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Vehicle &amp; Violation Code
                    </span>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Registration:</span>
                      <span className="font-mono font-bold text-white">{selectedReport.vehicle_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Vehicle Type:</span>
                      <span className="text-slate-200">{selectedReport.vehicle_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Violation Code:</span>
                      <span className="font-mono text-cyan-400">{selectedReport.violation_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Category:</span>
                      <span className="text-blue-300 font-semibold">{selectedReport.category}</span>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Enforcement Assignment
                    </span>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Enforcement Zone:</span>
                      <span className="text-slate-200">{selectedReport.zone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Assigned Handler:</span>
                      <span className="font-semibold text-emerald-400">
                        {selectedReport.handler_name || 'In Priority Queue'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Citizen Reporter:</span>
                      <span className="text-slate-200">{selectedReport.reporter_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Contact:</span>
                      <span className="text-slate-400 font-mono">{selectedReport.reporter_email}</span>
                    </div>
                  </div>
                </div>

                {/* Description Box */}
                <div className="mt-4 bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Incident Description
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {selectedReport.description}
                  </p>
                </div>

                {/* Routing Decision Explanation */}
                {selectedReportDetails?.routing_logs && selectedReportDetails.routing_logs.length > 0 && (
                  <div className="mt-4 bg-blue-950/20 p-3.5 rounded-lg border border-blue-900/40 text-xs">
                    <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider block mb-1">
                      Explainable Routing Decision
                    </span>
                    <p className="text-slate-300 italic">
                      "{selectedReportDetails.routing_logs[0].routing_reason}"
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-12 text-center text-slate-500">
              <FileText className="w-10 h-10 mx-auto mb-3 text-slate-600" />
              <p className="text-sm font-medium">Select a report from the list to view its real-time enforcement timeline.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

