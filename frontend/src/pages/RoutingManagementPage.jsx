import React, { useState, useEffect } from 'react';
import { 
  Share2, ShieldAlert, AlertTriangle, CheckCircle2, Clock, 
  Layers, RefreshCw, Zap, ArrowRight, UserCheck, ShieldCheck,
  Server, Cpu, Eye
} from 'lucide-react';
import { api } from '../services/api';
import { PriorityBadge, StatusBadge } from '../components/Badge';

export function RoutingManagementPage() {
  const [routingData, setRoutingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reprocessing, setReprocessing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('queue'); // queue | fleet | rules | logs

  const loadRoutingData = async () => {
    try {
      setLoading(true);
      const res = await api.getRoutingOverview();
      if (res.success) {
        setRoutingData(res);
      }
    } catch (err) {
      console.error('Failed to load routing overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutingData();
  }, []);

  const handleReprocessQueue = async () => {
    try {
      setReprocessing(true);
      const res = await api.reprocessQueue();
      if (res.success) {
        setToastMessage(`Priority dispatch algorithm re-evaluated. ${res.reprocessed.length} reports successfully dispatched!`);
        setTimeout(() => setToastMessage(null), 5000);
        loadRoutingData();
      }
    } catch (err) {
      alert('Reprocess queue failed: ' + err.message);
    } finally {
      setReprocessing(false);
    }
  };

  if (loading && !routingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
          <span>Loading intelligent dispatch matrix...</span>
        </div>
      </div>
    );
  }

  const queuedReports = routingData?.queued_reports || [];
  const handlers = routingData?.handlers || [];
  const rules = routingData?.routing_rules || [];
  const logs = routingData?.recent_logs || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-blue-950 border border-blue-500/50 text-blue-200 px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom">
          <Zap className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Module D (Core Engine)
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Intelligent Report Dispatch &amp; Routing Engine
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Dynamic rule evaluation, capacity balancing, backup failover, and explainable decision auditing.
          </p>
        </div>

        {/* Global Dispatch Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={loadRoutingData}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Refresh Routing Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleReprocessQueue}
            disabled={reprocessing}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg shadow-lg shadow-blue-600/25 transition cursor-pointer disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${reprocessing ? 'animate-bounce' : 'text-amber-300'}`} />
            <span>{reprocessing ? 'Evaluating Capacities...' : 'Re-dispatch Priority Queue'}</span>
          </button>
        </div>
      </div>

      {/* Top Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Active Dispatch Rules</span>
          <p className="text-2xl font-mono font-bold text-white mt-1">{rules.length}</p>
          <span className="text-[10px] text-slate-500">Across 5 zones &amp; 5 categories</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Queued / Buffer</span>
          <p className="text-2xl font-mono font-bold text-amber-400 mt-1">
            {queuedReports.filter(q => q.status !== 'Escalated').length}
          </p>
          <span className="text-[10px] text-slate-500">Awaiting capacity release</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Critical Escalations</span>
          <p className="text-2xl font-mono font-bold text-rose-400 mt-1">
            {queuedReports.filter(q => q.status === 'Escalated').length}
          </p>
          <span className="text-[10px] text-slate-500">Supervisor intervention required</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Active Handlers</span>
          <p className="text-2xl font-mono font-bold text-emerald-400 mt-1">
            {handlers.filter(h => h.availability === 1).length} / {handlers.length}
          </p>
          <span className="text-[10px] text-slate-500">On-duty enforcement fleet</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'queue'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Priority Queue &amp; Escalations ({queuedReports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('fleet')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'fleet'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Officer Capacity Deck ({handlers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'rules'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Master Routing Rules Matrix ({rules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'logs'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Routing Decision Audit Logs</span>
        </button>
      </div>

      {/* TAB 1: Priority Queue & Escalated Reports */}
      {activeTab === 'queue' && (
        <div className="bg-slate-900/70 rounded-xl border border-slate-800 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-800 gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Priority Dispatch Buffer</span>
                <span className="text-[11px] font-normal text-slate-400">
                  (Ordered strictly: Critical &gt; High &gt; Medium &gt; Low, then FIFO by timestamp)
                </span>
              </h3>
            </div>
          </div>

          {queuedReports.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/60" />
              <p>Dispatch buffer empty! All valid reports have been allocated to active officers.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Priority Rank</th>
                    <th className="py-3 px-3">Report ID</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Zone</th>
                    <th className="py-3 px-3">Plate &amp; Type</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Logged At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {queuedReports.map((q, idx) => (
                    <tr 
                      key={q.report_id} 
                      className={`hover:bg-slate-800/40 transition ${
                        q.status === 'Escalated' ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-400">
                        #{idx + 1}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-blue-400">
                        {q.report_id}
                      </td>
                      <td className="py-3.5 px-3 font-medium text-slate-200">
                        {q.category}
                      </td>
                      <td className="py-3.5 px-3 text-slate-400">
                        {q.zone.split(' - ')[0]}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-300">
                        {q.vehicle_number}
                      </td>
                      <td className="py-3.5 px-3">
                        <PriorityBadge priority={q.priority} />
                      </td>
                      <td className="py-3.5 px-3">
                        <StatusBadge status={q.status} />
                      </td>
                      <td className="py-3.5 px-3 text-slate-400 text-[11px]">
                        {new Date(q.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Officer Capacity Deck */}
      {activeTab === 'fleet' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {handlers.map((h) => {
            const util = Math.round((h.current_load / h.capacity) * 100);
            return (
              <div 
                key={h.id}
                className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 shadow-sm hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-white text-sm">{h.name}</h4>
                    <span className="text-[11px] text-slate-400">{h.assigned_zone}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    h.availability 
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  }`}>
                    {h.availability ? 'AVAILABLE' : 'UNAVAILABLE'}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Workload / Capacity:</span>
                    <span className="font-mono font-bold text-white">{h.current_load} / {h.capacity}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        util >= 100 ? 'bg-rose-500' : util >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, util)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {util}% capacity utilization
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: Master Routing Rules Matrix */}
      {activeTab === 'rules' && (
        <div className="bg-slate-900/70 rounded-xl border border-slate-800 p-5 shadow-sm">
          <div className="pb-3 mb-4 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">
              Primary &amp; Designated Backup Routing Table
            </h3>
            <p className="text-xs text-slate-400">
              Evaluated sequentially: Primary Handler → Backup Handler → Lowest Workload Fleet Fallback → Priority Queue / Escalation.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Violation Category</th>
                  <th className="py-3 px-3">Zone</th>
                  <th className="py-3 px-3">Primary Handler (1st Choice)</th>
                  <th className="py-3 px-3">Backup Handler (Failover)</th>
                  <th className="py-3 px-3">Primary Capacity</th>
                  <th className="py-3 px-3">Backup Capacity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-semibold text-slate-200">
                      {rule.category}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {rule.zone.split(' - ')[0]}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-blue-400">{rule.primary_name}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        (Active Load: {rule.primary_load}/{rule.primary_cap})
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-indigo-400">{rule.backup_name}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        (Active Load: {rule.backup_load}/{rule.backup_cap})
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono ${
                        rule.primary_load >= rule.primary_cap ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {rule.primary_load >= rule.primary_cap ? 'SATURATED' : 'AVAILABLE'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono ${
                        rule.backup_load >= rule.backup_cap ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {rule.backup_load >= rule.backup_cap ? 'SATURATED' : 'AVAILABLE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Explainable Decision Audit Logs */}
      {activeTab === 'logs' && (
        <div className="bg-slate-900/70 rounded-xl border border-slate-800 p-5 shadow-sm">
          <div className="pb-3 mb-4 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">
              Explainable Routing Audit Log Trail
            </h3>
            <p className="text-xs text-slate-400">
              Complete mathematical and algorithmic justification for every dispatch decision.
            </p>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {logs.map((log) => (
              <div 
                key={log.id} 
                className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5 text-xs hover:border-slate-700 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-2 border-b border-slate-800/60 gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-400">{log.report_id}</span>
                    <PriorityBadge priority={log.priority} />
                    <span className="text-slate-400">| {log.category}</span>
                    <span className="text-slate-400 font-mono text-[11px]">({log.zone?.split(' - ')[0]})</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="text-slate-300">
                  <strong className="text-slate-400 uppercase text-[10px] tracking-wide block mb-0.5">
                    Algorithmic Decision Reason:
                  </strong>
                  <p className="italic text-slate-200 bg-slate-900/60 p-2 rounded border border-slate-800/50">
                    "{log.routing_reason}"
                  </p>
                </div>

                {log.handler_name && (
                  <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                    <span>Officer Assigned:</span>
                    <span className="font-semibold text-emerald-400">{log.handler_name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

