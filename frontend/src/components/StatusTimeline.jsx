import React from 'react';
import { CheckCircle2, Clock, ShieldAlert, Cpu, UserCheck, PlayCircle, CheckSquare } from 'lucide-react';

const STEPS = [
  { id: 'Submitted', label: 'Submitted', desc: 'Citizen report filed', icon: Clock },
  { id: 'Validated', label: 'Validated', desc: 'DFA & Regex check', icon: Cpu },
  { id: 'Classified', label: 'Classified', desc: 'Category & priority set', icon: ShieldAlert },
  { id: 'Assigned', label: 'Assigned', desc: 'Routed to officer', icon: UserCheck },
  { id: 'In Progress', label: 'In Progress', desc: 'Enforcement dispatched', icon: PlayCircle },
  { id: 'Resolved', label: 'Resolved', desc: 'Violation closed', icon: CheckSquare }
];

export function StatusTimeline({ currentStatus = 'Submitted', history = [] }) {
  const isEscalated = currentStatus === 'Escalated';

  const getStepIndex = (status) => {
    switch (status) {
      case 'Submitted': return 0;
      case 'Validated': return 1;
      case 'Classified': return 2;
      case 'Assigned': return 3;
      case 'In Progress': return 4;
      case 'Resolved': return 5;
      case 'Escalated': return 3; // Escalated branches at assignment stage
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(currentStatus);

  return (
    <div className="w-full bg-slate-900/60 rounded-xl border border-slate-800 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Enforcement Lifecycle Status Timeline
        </h4>
        {isEscalated && (
          <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
            Escalated to Supervisor
          </span>
        )}
      </div>

      {/* Desktop Step Flow */}
      <div className="relative">
        <div className="hidden md:flex items-center justify-between relative z-10">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentIndex || currentStatus === 'Resolved';
            const isCurrent = idx === currentIndex && currentStatus !== 'Resolved';
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center flex-1 relative group">
                {/* Connecting Line */}
                {idx < STEPS.length - 1 && (
                  <div 
                    className={`absolute top-4 left-1/2 w-full h-[2px] -z-10 transition-colors duration-500 ${
                      idx < currentIndex ? 'bg-emerald-500' : 'bg-slate-800'
                    }`} 
                  />
                )}

                {/* Step Circle */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border ${
                    isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-lg shadow-emerald-500/20'
                      : isCurrent
                      ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/30 scale-110 ring-4 ring-blue-500/20 animate-pulse'
                      : 'bg-slate-800/80 text-slate-500 border-slate-700'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>

                {/* Step Title & Subtitle */}
                <div className="text-center mt-2.5">
                  <p className={`text-xs font-semibold ${isCurrent ? 'text-blue-300' : isCompleted ? 'text-slate-200' : 'text-slate-500'}`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-slate-400 hidden lg:block">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Vertical Flow */}
        <div className="md:hidden space-y-3">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentIndex || currentStatus === 'Resolved';
            const isCurrent = idx === currentIndex && currentStatus !== 'Resolved';
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border text-xs ${
                    isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                      : isCurrent
                      ? 'bg-blue-600 text-white border-blue-400 animate-pulse'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className={`text-xs font-medium ${isCurrent ? 'text-blue-300 font-semibold' : isCompleted ? 'text-slate-200' : 'text-slate-500'}`}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-slate-400">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* History Audit Trail if present */}
      {history && history.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <p className="text-[11px] font-medium text-slate-400 mb-2">Detailed Status Audit Trail:</p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] bg-slate-950/40 px-2.5 py-1.5 rounded border border-slate-800/50">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{h.old_status}</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-blue-400 font-medium">{h.new_status}</span>
                  <span className="text-slate-500 text-[10px]">({h.updated_by})</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
