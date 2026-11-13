import React, { useState, useEffect } from 'react';
import { 
  Cpu, CheckCircle2, XCircle, ArrowRight, Activity, 
  HelpCircle, Layers, Play, RefreshCw, Terminal, Check
} from 'lucide-react';
import { api } from '../services/api';

const AUTOMATA_ENGINES = [
  {
    id: 'vehicle_number',
    name: 'Vehicle Registration DFA',
    format: '[A-Z]{2}[- ]?[0-9]{2}[- ]?[A-Z]{1,2}[- ]?[0-9]{4}',
    examples: ['DL-01-AB-1234', 'CA 12 XY 9876', 'NY04A1234', 'MH-12-DE-1433'],
    invalidExamples: ['INVALID-99', '12-AB-34', 'DL-01-AB-12345'],
    initialValue: 'DL-01-AB-1234',
    description: 'Deterministic automaton recognizing formal vehicle license plate syntax with optional state separators and series codes.'
  },
  {
    id: 'violation_code',
    name: 'Violation Code DFA',
    format: '(NPZ|IMP|PSM|OST|TOB)-[0-9]{3}',
    examples: ['NPZ-101', 'IMP-201', 'PSM-301', 'OST-401', 'TOB-501'],
    invalidExamples: ['XYZ-999', 'NPZ-10', 'TOB-ABC', 'OST101'],
    initialValue: 'TOB-501',
    description: 'Finite state machine validating municipal violation taxonomy with 3-character category prefix followed by 3 numerical digits.'
  },
  {
    id: 'phone',
    name: 'Phone Number DFA',
    format: '^\\+?[0-9]{10,12}$',
    examples: ['9876543210', '+12345678901', '123456789012'],
    invalidExamples: ['12345', '987654321012345', 'abc1234567'],
    initialValue: '9876543210',
    description: 'Counting state machine recognizing standard 10-to-12 digit phone numbers with optional international plus prefix.'
  },
  {
    id: 'reporter_email',
    name: 'Email Address DFA',
    format: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    examples: ['officer@city.gov', 'sarah.jenkins@metropolice.org', 'citizen@parkguard.io'],
    invalidExamples: ['not-an-email', '@domain.com', 'user@domain'],
    initialValue: 'officer@city.gov',
    description: 'Transition automaton parsing local-part, @ delimiter, domain name, dot, and top-level domain.'
  }
];

export function DFASimulatorPage() {
  const [selectedEngine, setSelectedEngine] = useState(AUTOMATA_ENGINES[0]);
  const [inputVal, setInputVal] = useState(AUTOMATA_ENGINES[0].initialValue);
  const [simulationResult, setSimulationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async (fieldId, value) => {
    try {
      setLoading(true);
      const res = await api.validateField(fieldId, value);
      setSimulationResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation(selectedEngine.id, inputVal);
  }, [selectedEngine]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputVal(val);
    runSimulation(selectedEngine.id, val);
  };

  const handleSelectEngine = (eng) => {
    setSelectedEngine(eng);
    setInputVal(eng.initialValue);
  };

  const dfa = simulationResult?.dfa;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Interactive Hackathon Tool
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Formal DFA State Machine Simulation &amp; Inspector
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Simulate Deterministic Finite Automata $M = (Q, \Sigma, \delta, q_0, F)$ transitions character-by-character and verify equivalence against regular expressions.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-mono">
            Formal State Machine Engine: Active
          </span>
        </div>
      </div>

      {/* Engine Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 my-6">
        {AUTOMATA_ENGINES.map((eng) => (
          <button
            key={eng.id}
            onClick={() => handleSelectEngine(eng)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
              selectedEngine.id === eng.id
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{eng.name}</span>
          </button>
        ))}
      </div>

      {/* Main Sandbox Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Input & Test Controls */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Automaton Input Terminal
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {selectedEngine.description}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Test String Input ($\Sigma^*$):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputVal}
                    onChange={handleInputChange}
                    placeholder="Type string to simulate..."
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {loading && (
                    <RefreshCw className="w-4 h-4 text-blue-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                  Expected Regex: {selectedEngine.format}
                </span>
              </div>

              {/* Sample Test Palettes */}
              <div className="pt-3 border-t border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                  Pre-configured Valid Test Vectors:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedEngine.examples.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInputVal(ex);
                        runSimulation(selectedEngine.id, ex);
                      }}
                      className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-mono hover:bg-emerald-500/20 transition cursor-pointer"
                    >
                      {ex}
                    </button>
                  ))}
                </div>

                <span className="text-[11px] font-semibold text-slate-400 block mt-3 mb-2">
                  Pre-configured Invalid Test Vectors:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedEngine.invalidExamples.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInputVal(ex);
                        runSimulation(selectedEngine.id, ex);
                      }}
                      className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 text-xs font-mono hover:bg-rose-500/20 transition cursor-pointer"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mathematical Automaton Definition Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-xs text-slate-400">
            <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Formal Specification: $M = (Q, \Sigma, \delta, q_0, F)$</span>
            </h4>
            <ul className="space-y-1.5 font-mono text-[11px]">
              <li><strong className="text-slate-300">Start State $q_0$:</strong> {dfa?.start_state || 'Q_START'}</li>
              <li><strong className="text-slate-300">Accept States $F$:</strong> [{dfa?.accept_states?.join(', ') || ''}]</li>
              <li><strong className="text-slate-300">Alphabet $\Sigma$:</strong> Uppercase Letters, Digits, Separators</li>
              <li><strong className="text-slate-300">Dead / Trap State:</strong> TRAP (Sink)</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Live Simulation Outcome & Transition Graph */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Simulation Verification Results</span>
              </h3>

              {simulationResult && (
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold border ${
                    simulationResult.agreement
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  }`}>
                    {simulationResult.agreement ? 'Agreement: Exact Match' : 'Agreement: Conflict Detected'}
                  </span>

                  <span className={`px-3 py-1 rounded text-xs font-extrabold border ${
                    simulationResult.is_valid
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-lg shadow-emerald-500/20'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-lg shadow-rose-500/20'
                  }`}>
                    {simulationResult.is_valid ? 'ACCEPTED (L(M))' : 'REJECTED'}
                  </span>
                </div>
              )}
            </div>

            {/* Diagnostics Bar */}
            {simulationResult && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4 text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">DFA Formal Engine:</span>
                  <span className={`font-bold font-mono ${simulationResult.dfa_valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {simulationResult.dfa_valid ? 'VALID (Accepting)' : 'INVALID (Non-accepting)'}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Regex Engine:</span>
                  <span className={`font-bold font-mono ${simulationResult.regex_valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {simulationResult.regex_valid ? 'VALID (Matched)' : 'INVALID (Failed)'}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 col-span-2 sm:col-span-1">
                  <span className="text-slate-400 block text-[11px]">Final Terminal State:</span>
                  <span className="font-bold font-mono text-cyan-400">
                    {dfa?.final_state || 'N/A'}
                  </span>
                </div>
              </div>
            )}

            {/* Error Message if Rejected */}
            {simulationResult && !simulationResult.is_valid && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-xs text-rose-300 my-4 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{simulationResult.message}</span>
              </div>
            )}

            {/* Execution Trace Timeline */}
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Deterministic Transition Sequence (Execution Trace)</span>
              </h4>

              {dfa && dfa.state_history && dfa.state_history.length > 0 ? (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {dfa.state_history.map((step, idx) => (
                    <div 
                      key={idx}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-mono transition ${
                        step.to_state === 'TRAP'
                          ? 'bg-rose-950/30 border-rose-800/80 text-rose-300'
                          : step.is_accept
                          ? 'bg-emerald-950/40 border-emerald-700/80 text-emerald-200'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-slate-500 font-sans text-[11px]">#{step.step}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-300 font-bold border border-slate-700">
                          '{step.char}'
                        </span>
                        <span className="text-slate-400">{step.from_state}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        <span className={step.is_accept ? 'text-emerald-400 font-bold' : step.to_state === 'TRAP' ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                          {step.to_state}
                        </span>
                      </div>

                      <div>
                        {step.is_accept && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            ACCEPT STATE
                          </span>
                        )}
                        {step.to_state === 'TRAP' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            TRAP STATE
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-500 text-xs py-8 text-center">
                  No input character transitions recorded.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

