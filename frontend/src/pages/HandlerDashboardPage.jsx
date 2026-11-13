import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, UserCheck, PlayCircle, CheckCircle2, AlertTriangle, 
  Clock, Power, Settings, RefreshCw, Car, MapPin, Eye, Check
} from 'lucide-react';
import { api } from '../services/api';
import { PriorityBadge, StatusBadge } from '../components/Badge';
import { StatusTimeline } from '../components/StatusTimeline';

export function HandlerDashboardPage() {
  const [handlers, setHandlers] = useState([]);
  const [selectedHandlerId, setSelectedHandlerId] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [detailModalReport, setDetailModalReport] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getHandlers();
      if (res.success && res.handlers.length > 0) {
        setHandlers(res.handlers);
        if (!selectedHandlerId) {
          setSelectedHandlerId(res.handlers[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load handlers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Whenever selected handler changes, load their assigned reports
  useEffect(() => {
    if (selectedHandlerId) {
      api.getReports({ handler_id: selectedHandlerId }).then((res) => {
        if (res.success) {
          setReports(res.reports);
        }
      }).catch(console.error);
    }
  }, [selectedHandlerId]);

  const activeHandler = handlers.find(h => h.id === selectedHandlerId) || handlers[0];

  const handleToggleAvailability = async () => {
    if (!activeHandler) return;
    const newAvail = activeHandler.availability ? 0 : 1;
    try {
      setUpdating(true);
      const res = await api.updateHandler(activeHandler.id, newAvail, activeHandler.capacity);
      if (res.success) {
        setHandlers(prev => prev.map(h => h.id === activeHandler.id ? res.handler : h));
        showToast(`Officer availability set to ${newAvail ? 'AVAILABLE (On-Duty)' : 'UNAVAILABLE (Off-Duty)'}`);
      }
    } catch (err) {
      alert('Failed to update availability: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateCapacity = async (delta) => {
    if (!activeHandler) return;
    const newCap = Math.max(1, activeHandler.capacity + delta);
    try {
      setUpdating(true);
      const res = await api.updateHandler(activeHandler.id, activeHandler.availability, newCap);
      if (res.success) {
        setHandlers(prev => prev.map(h => h.id === activeHandler.id ? res.handler : h));
        showToast(`Officer capacity updated to ${newCap}`);
      }
    } catch (err) {
      alert('Failed to update capacity: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (reportId, newStatus) => {
    try {
      setUpdating(true);
      const res = await api.updateReportStatus(reportId, newStatus, activeHandler?.name || 'Officer');
      if (res.success) {
        showToast(`Report ${reportId} marked as '${newStatus}'!`);
        // Refresh reports and handlers
        const [repRes, handRes] = await Promise.all([
          api.getReports({ handler_id: selectedHandlerId }),
          api.getHandlers()
        ]);
        if (repRes.success) setReports(repRes.reports);
        if (handRes.success) setHandlers(handRes.handlers);
        if (detailModalReport && detailModalReport.report.report_id === reportId) {
          const detRes = await api.getReportDetails(reportId);
          if (detRes.success) setDetailModalReport(detRes);
        }
      }
    } catch (err) {
      alert('Failed to update report status: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const openDetails = async (reportId) => {
    try {
      const res = await api.getReportDetails(reportId);
      if (res.success) {
        setDetailModalReport(res);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const utilizationRate = activeHandler ? Math.round((activeHandler.current_load / activeHandler.capacity) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-950 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Module C
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Enforcement Officer Management Deck
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Manage handler availability, maximum handling capacity, and active field assignments.
          </p>
        </div>

        {/* Officer Selection Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium">Active Profile:</label>
          <select
            value={selectedHandlerId || ''}
            onChange={(e) => setSelectedHandlerId(Number(e.target.value))}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
          >
            {handlers.map(h => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.assigned_zone.split(' - ')[0]} - Load: {h.current_load}/{h.capacity})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Handler Profile Bar */}
      {activeHandler && (
        <div className="my-6 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 rounded-2xl border border-slate-800 p-6 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Officer Info & Specializations */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">{activeHandler.name}</h2>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    activeHandler.availability
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}>
                    {activeHandler.availability ? 'AVAILABLE / ON-DUTY' : 'UNAVAILABLE / OFF-DUTY'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>Assigned Zone: <strong>{activeHandler.assigned_zone}</strong></span>
                </p>

                {/* Specialization Badges */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Specializations:</span>
                  {(activeHandler.categories || []).map((cat, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] border border-slate-700">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Capacity & Workload Controls */}
            <div className="flex flex-wrap items-center gap-6 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              
              {/* Load Progress Bar */}
              <div className="w-48">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Current Workload:</span>
                  <span className="font-mono font-bold text-white">
                    {activeHandler.current_load} / {activeHandler.capacity}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      utilizationRate >= 100
                        ? 'bg-rose-500'
                        : utilizationRate >= 70
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, utilizationRate)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {utilizationRate}% utilization ({activeHandler.capacity - activeHandler.current_load} slots free)
                </span>
              </div>

              {/* Adjust Capacity Controls */}
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                  Adjust Capacity
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleUpdateCapacity(-1)}
                    disabled={updating || activeHandler.capacity <= 1}
                    className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center border border-slate-700 disabled:opacity-30 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-mono font-bold text-sm text-white">
                    {activeHandler.capacity}
                  </span>
                  <button
                    onClick={() => handleUpdateCapacity(1)}
                    disabled={updating || activeHandler.capacity >= 15}
                    className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center border border-slate-700 disabled:opacity-30 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Toggle Duty Status Button */}
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                  Duty Switch
                </span>
                <button
                  onClick={handleToggleAvailability}
                  disabled={updating}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                    activeHandler.availability
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{activeHandler.availability ? 'Go Off-Duty' : 'Go On-Duty'}</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Assigned Reports Table */}
      <div className="bg-slate-900/70 rounded-xl border border-slate-800 p-5 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white">
              Assigned Field Cases ({reports.length})
            </h3>
            <p className="text-xs text-slate-400">
              Live cases allocated to this handler by the PARKGUARD dispatch algorithm.
            </p>
          </div>

          <button
            onClick={() => {
              if (selectedHandlerId) {
                api.getReports({ handler_id: selectedHandlerId }).then(res => res.success && setReports(res.reports));
              }
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Cases</span>
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No active reports assigned to this officer.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Report ID</th>
                  <th className="py-3 px-3">Vehicle Details</th>
                  <th className="py-3 px-3">Violation Category</th>
                  <th className="py-3 px-3">Zone</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Logged</th>
                  <th className="py-3 px-3 text-right">Officer Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reports.map((rep) => (
                  <tr key={rep.report_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-3 font-mono font-bold text-blue-400 whitespace-nowrap">
                      {rep.report_id}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="font-mono font-semibold text-white block">{rep.vehicle_number}</span>
                      <span className="text-[10px] text-slate-400">{rep.vehicle_type}</span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      <span className="font-medium">{rep.category}</span>
                      <span className="block text-[10px] font-mono text-cyan-400">{rep.violation_code}</span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-400 whitespace-nowrap">
                      {rep.zone.split(' - ')[0]}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <PriorityBadge priority={rep.priority} />
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <StatusBadge status={rep.status} />
                    </td>
                    <td className="py-3.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(rep.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-3 text-right whitespace-nowrap space-x-1.5">
                      {/* Mark In Progress */}
                      {rep.status === 'Assigned' && (
                        <button
                          onClick={() => handleUpdateStatus(rep.report_id, 'In Progress')}
                          disabled={updating}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 rounded transition cursor-pointer"
                        >
                          Start Enforcing
                        </button>
                      )}

                      {/* Mark Resolved */}
                      {rep.status === 'In Progress' && (
                        <button
                          onClick={() => handleUpdateStatus(rep.report_id, 'Resolved')}
                          disabled={updating}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 rounded transition cursor-pointer"
                        >
                          Resolve &amp; Cite
                        </button>
                      )}

                      {rep.status === 'Resolved' && (
                        <span className="text-[11px] text-slate-500 italic pr-2">Case Closed</span>
                      )}

                      {/* Details Button */}
                      <button
                        onClick={() => openDetails(rep.report_id)}
                        className="p-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition cursor-pointer inline-flex items-center"
                        title="View Full Case File"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Case Details Modal */}
      {detailModalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono font-bold text-blue-400">ENFORCEMENT DOSSIER</span>
                <h3 className="text-xl font-black text-white font-mono">
                  {detailModalReport.report.report_id}
                </h3>
              </div>
              <button
                onClick={() => setDetailModalReport(null)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="my-4">
              <StatusTimeline 
                currentStatus={detailModalReport.report.status}
                history={detailModalReport.status_history || []}
              />
            </div>

            <div className="space-y-3 text-xs bg-slate-950/60 p-4 rounded-xl border border-slate-800 my-4">
              <p className="text-slate-300">
                <strong>Incident Description:</strong> {detailModalReport.report.description}
              </p>
              <div className="grid grid-cols-2 gap-2 text-slate-400 pt-2 border-t border-slate-800">
                <div>Vehicle: <span className="font-mono text-white font-bold">{detailModalReport.report.vehicle_number}</span> ({detailModalReport.report.vehicle_type})</div>
                <div>Violation: <span className="text-cyan-400 font-mono">{detailModalReport.report.violation_code}</span></div>
                <div>Citizen: {detailModalReport.report.reporter_name} ({detailModalReport.report.phone})</div>
                <div>Zone: {detailModalReport.report.zone}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {detailModalReport.report.status === 'Assigned' && (
                <button
                  onClick={() => handleUpdateStatus(detailModalReport.report.report_id, 'In Progress')}
                  className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition cursor-pointer"
                >
                  Mark In Progress
                </button>
              )}
              {detailModalReport.report.status === 'In Progress' && (
                <button
                  onClick={() => handleUpdateStatus(detailModalReport.report.report_id, 'Resolved')}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition cursor-pointer"
                >
                  Mark Resolved
                </button>
              )}
              <button
                onClick={() => setDetailModalReport(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
