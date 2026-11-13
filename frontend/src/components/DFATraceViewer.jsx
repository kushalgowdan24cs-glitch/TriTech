import React, { useState } from 'react';
import { Cpu, CheckCircle2, XCircle, ArrowRight, Activity, HelpCircle, Layers } from 'lucide-react';

export function DFATraceViewer({ validationResult, title = 'DFA State Transition Simulation' }) {
  const [expanded, setExpanded] = useState(false);

  if (!validationResult) return null;

  const dfa = validationResult.dfa;
  const isDFAValid = validationResult.dfa_valid;
  const isRegexValid = validationResult.regex_valid;
  const agreement = validationResult.agreement;

  return (
    <div className="mt-2 text-xs bg-slate-950/80 rounded-lg border border-slate-800 p-3 shadow-inner">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold text-slate-200">{title}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            ({dfa ? `${dfa.total_steps} steps` : 'Regex Checked'})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Agreement Badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
            agreement 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}>
            {agreement ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
            {agreement ? 'DFA ≡ Regex' : 'DFA ≠ Regex'}
          </span>

          {/* Validation Result Badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
            isDFAValid 
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' 
              : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
          }`}>
            {isDFAValid ? 'ACCEPTED' : 'REJECTED'}
          </span>

          {dfa && dfa.state_history && dfa.state_history.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] text-blue-400 hover:text-blue-300 underline font-medium ml-1 cursor-pointer"
            >
              {expanded ? 'Hide Trace' : 'View Trace'}
            </button>
          )}
        </div>
      </div>

      {/* Summary Line */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 text-[11px] text-slate-400">
        <div>
          <span className="text-slate-400">Final State: </span>
          <span className={`font-mono font-bold ${isDFAValid ? 'text-emerald-400' : 'text-rose-400'}`}>
            {dfa ? dfa.final_state : (isDFAValid ? 'ACCEPT' : 'TRAP')}
          </span>
        </div>
        {dfa && (
          <div>
            <span className="text-slate-400">Accept States: </span>
            <span className="font-mono text-slate-300">[{dfa.accept_states.join(', ')}]</span>
          </div>
        )}
      </div>

      {/* Expanded Transition Trace */}
      {expanded && dfa && dfa.state_history && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/80">
          <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-2 flex items-center gap-1">
            <Layers className="w-3 h-3 text-blue-400" />
            Step-by-Step Formal State Transitions:
          </p>
          <div className="flex flex-wrap items-center gap-1.5 max-h-48 overflow-y-auto p-1.5 bg-slate-900/90 rounded border border-slate-800">
            {dfa.state_history.map((step, idx) => (
              <div 
                key={idx}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono border ${
                  step.to_state === 'TRAP'
                    ? 'bg-rose-950/50 text-rose-300 border-rose-800'
                    : step.is_accept
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700 ring-1 ring-emerald-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <span className="text-slate-400 font-sans">#{step.step}</span>
                <span className="px-1 py-0.2 rounded bg-slate-700/80 text-blue-300 font-bold">
                  '{step.char}'
                </span>
                <span className="text-slate-400">{step.from_state}</span>
                <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
                <span className={step.is_accept ? 'text-emerald-400 font-bold' : step.to_state === 'TRAP' ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                  {step.to_state}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
