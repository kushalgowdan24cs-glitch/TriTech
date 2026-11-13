import React from 'react';
import { AlertTriangle, AlertCircle, Clock, CheckCircle2, ShieldAlert, ArrowUpRight } from 'lucide-react';

export function PriorityBadge({ priority, size = 'sm' }) {
  const styles = {
    Critical: 'bg-red-500/15 text-red-400 border-red-500/30 shadow-red-500/10',
    High: 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-amber-500/10',
    Medium: 'bg-blue-500/15 text-blue-300 border-blue-500/30 shadow-blue-500/10',
    Low: 'bg-slate-500/15 text-slate-300 border-slate-500/30'
  };

  const icons = {
    Critical: <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-pulse" />,
    High: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
    Medium: <AlertCircle className="w-3.5 h-3.5 text-blue-400" />,
    Low: <Clock className="w-3.5 h-3.5 text-slate-400" />
  };

  const sizeClasses = size === 'lg' ? 'px-3 py-1.5 text-xs font-semibold' : 'px-2.5 py-1 text-[11px] font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border shadow-sm ${styles[priority] || styles.Medium} ${sizeClasses}`}>
      {icons[priority]}
      <span>{priority}</span>
    </span>
  );
}

export function StatusBadge({ status, size = 'sm' }) {
  const styles = {
    Submitted: 'bg-slate-800 text-slate-300 border-slate-700',
    Validated: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    Classified: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    Assigned: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    'In Progress': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    Resolved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    Escalated: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
  };

  const icons = {
    Submitted: <Clock className="w-3 h-3 text-slate-400" />,
    Validated: <CheckCircle2 className="w-3 h-3 text-cyan-400" />,
    Classified: <ArrowUpRight className="w-3 h-3 text-indigo-400" />,
    Assigned: <Clock className="w-3 h-3 text-sky-400" />,
    'In Progress': <AlertCircle className="w-3 h-3 text-amber-400" />,
    Resolved: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
    Escalated: <AlertTriangle className="w-3 h-3 text-rose-400" />
  };

  const sizeClasses = size === 'lg' ? 'px-3 py-1.5 text-xs font-semibold' : 'px-2.5 py-1 text-[11px] font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border ${styles[status] || styles.Submitted} ${sizeClasses}`}>
      {icons[status]}
      <span>{status}</span>
    </span>
  );
}
