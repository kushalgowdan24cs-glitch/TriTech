import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FilePlus, CheckCircle2, AlertTriangle, Cpu, ShieldAlert, 
  Send, RefreshCw, Car, MapPin, User, FileCode, ArrowRight,
  ExternalLink, Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { PriorityBadge, StatusBadge } from '../components/Badge';
import { DFATraceViewer } from '../components/DFATraceViewer';

export function ReportSubmissionPage() {
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    reporter_name: '',
    reporter_email: '',
    phone: '',
    vehicle_number: '',
    vehicle_type: 'Sedan',
    zone: 'Zone A - Downtown Commercial',
    violation_code: 'PV05',
    urgency_level: 'Critical',
    description: ''
  });

  // Validation State for interactive feedback
  const [validationStates, setValidationStates] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [metadata, setMetadata] = useState(null);

  // Live Detected Classification Preview
  const [previewClassification, setPreviewClassification] = useState({
    category: 'Traffic Obstruction',
    priority: 'Critical',
    reason: 'Code PV05 designates immediate traffic obstruction.'
  });

  // Load centralized metadata
  useEffect(() => {
    api.getMetadata().then((data) => {
      setMetadata(data);
    }).catch(console.error);
  }, []);

  // Run live field validation debounced
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Real-time validation for validated fields
    if (['vehicle_number', 'phone', 'reporter_email', 'violation_code'].includes(field)) {
      api.validateField(field, value).then(res => {
        setValidationStates(prev => ({ ...prev, [field]: res }));
      }).catch(console.error);
    }

    // Dynamic live classification preview
    const desc = field === 'description' ? value : formData.description;
    const code = field === 'violation_code' ? value : formData.violation_code;
    const urgency = field === 'urgency_level' ? value : formData.urgency_level;

    updateClassificationPreview(code, desc, urgency);
  };

  const updateClassificationPreview = (code, desc, urgency) => {
    const lowerDesc = (desc || '').toLowerCase();
    const cleanCode = (code || '').toUpperCase();

    if (lowerDesc.includes('fire hydrant') || lowerDesc.includes('ambulance') || lowerDesc.includes('emergency') || cleanCode === 'PV05' || urgency === 'Critical') {
      setPreviewClassification({
        category: 'Traffic Obstruction',
        priority: 'Critical',
        reason: 'CRITICAL PRECEDENCE: Emergency corridor / traffic obstruction keywords or code PV05 detected.'
      });
    } else if (cleanCode === 'PV03' || lowerDesc.includes('handicap') || lowerDesc.includes('disabled') || lowerDesc.includes('ev charging')) {
      setPreviewClassification({
        category: 'Parking Space Misuse',
        priority: 'High',
        reason: 'High urgency accessibility / dedicated infrastructure stall violation (PV03).'
      });
    } else if (cleanCode === 'PV02' || lowerDesc.includes('double park') || lowerDesc.includes('sidewalk')) {
      setPreviewClassification({
        category: 'Improper Parking',
        priority: urgency === 'High' ? 'High' : 'Medium',
        reason: 'Improper physical alignment or obstruction of pedestrian curb (PV02).'
      });
    } else if (cleanCode === 'PV04' || lowerDesc.includes('overstay') || lowerDesc.includes('meter expired')) {
      setPreviewClassification({
        category: 'Overstay Violation',
        priority: urgency === 'High' ? 'High' : 'Low',
        reason: 'Temporal parking limit exceeded at meter or posted zone (PV04).'
      });
    } else {
      setPreviewClassification({
        category: 'No-Parking Zone Violation',
        priority: urgency || 'Medium',
        reason: 'Unauthorized parking in restricted municipal clearway (PV01).'
      });
    }
  };

  // Populate sample quick-fill for fast testing during hackathon demo
  const handleQuickFill = (preset) => {
    let presetData = {};
    if (preset === 'critical') {
      presetData = {
        reporter_name: 'Dr. Elizabeth Hayes',
        reporter_email: 'ehayes@medcenter.org',
        phone: '9876543210',
        vehicle_number: 'DL-01-AB-1234',
        vehicle_type: 'SUV / Crossover',
        zone: 'Zone C - Hospital & Transit Hub',
        violation_code: 'PV05',
        urgency_level: 'Critical',
        description: 'Black SUV blocking hospital trauma emergency vehicle intake and ambulance bay.'
      };
    } else if (preset === 'handicap') {
      presetData = {
        reporter_name: 'Marcus Brody',
        reporter_email: 'm.brody@civic.org',
        phone: '9812345678',
        vehicle_number: 'CA-12-XY-9876',
        vehicle_type: 'Sedan',
        zone: 'Zone A - Downtown Commercial',
        violation_code: 'PV03',
        urgency_level: 'High',
        description: 'Unauthorized commercial sedan parked in disabled wheelchair ramp without permit.'
      };
    } else {
      presetData = {
        reporter_name: 'Sarah Connor',
        reporter_email: 'sconnor@cyber.com',
        phone: '9845678901',
        vehicle_number: 'NY-04-CD-1234',
        vehicle_type: 'Truck / Heavy Commercial',
        zone: 'Zone B - Residential North',
        violation_code: 'PV02',
        urgency_level: 'Medium',
        description: 'Heavy truck parked diagonally across two residential parking bays encroaching sidewalk.'
      };
    }

    setFormData(presetData);
    Object.entries(presetData).forEach(([k, v]) => {
      if (['vehicle_number', 'phone', 'reporter_email', 'violation_code'].includes(k)) {
        api.validateField(k, v).then(res => {
          setValidationStates(prev => ({ ...prev, [k]: res }));
        });
      }
    });
    updateClassificationPreview(presetData.violation_code, presetData.description, presetData.urgency_level);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await api.submitReport(formData);
      if (res.success) {
        setSubmissionResult(res);
        try {
          const recent = JSON.parse(localStorage.getItem('parkguard_recent_reports') || '[]');
          const updated = [res.report.report_id, ...recent.filter(id => id !== res.report.report_id)].slice(0, 10);
          localStorage.setItem('parkguard_recent_reports', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
      } else {
        alert(res.error || (res.errors && res.errors.join('\n')) || 'Submission failed');
      }
    } catch (err) {
      alert('Network or server error during submission: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Module A
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Smart Parking Violation Report
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Submit an enforcement incident with live DFA state-transition validation & automatic dispatch routing.
          </p>
        </div>

        {/* Quick Demo Pre-fill Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Demo Presets:</span>
          <button
            type="button"
            onClick={() => handleQuickFill('critical')}
            className="px-2.5 py-1 text-xs font-semibold bg-red-500/15 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/25 transition cursor-pointer"
          >
            Critical Obstruction
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('handicap')}
            className="px-2.5 py-1 text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-lg hover:bg-amber-500/25 transition cursor-pointer"
          >
            Disabled Bay Misuse
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('improper')}
            className="px-2.5 py-1 text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/25 transition cursor-pointer"
          >
            Improper Double-Park
          </button>
        </div>
      </div>

      {/* Submission Success Modal / Alert */}
      {submissionResult && (
        <div className="my-6 p-6 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/40 shadow-xl shadow-emerald-950/50 backdrop-blur-md animate-in fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Incident Logged & Dispatched Successfully
                </span>
                <h3 className="text-xl font-extrabold text-white">
                  Report ID: <span className="font-mono text-emerald-300">{submissionResult.report.report_id}</span>
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={submissionResult.report.priority} size="lg" />
              <StatusBadge status={submissionResult.report.status} size="lg" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-emerald-500/20 text-xs">
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block font-medium">Detected Category:</span>
              <span className="text-slate-200 font-semibold">{submissionResult.classification.category}</span>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block font-medium">Assigned Officer:</span>
              <span className="text-blue-400 font-semibold">{submissionResult.report.handler_name || 'Queued / Escalated'}</span>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block font-medium">Routing Verdict:</span>
              <span className="text-slate-300 font-medium">{submissionResult.routing.routing_reason}</span>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setSubmissionResult(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition cursor-pointer"
            >
              Submit Another Report
            </button>
            <button
              type="button"
              onClick={() => navigate(`/user?search=${submissionResult.report.report_id}`)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 shadow-md shadow-blue-600/30 transition cursor-pointer"
            >
              <span>Track in Citizen Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Reporter Identity Card */}
            <div className="bg-slate-900/70 rounded-xl border border-slate-800 p-5 shadow-sm">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-800/80">
                <User className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-slate-200">1. Citizen Reporter Details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Officer Sarah Jenkins"
                    value={formData.reporter_name}
                    onChange={(e) => handleFieldChange('reporter_name', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="citizen@city.gov"
                    value={formData.reporter_email}
                    onChange={(e) => handleFieldChange('reporter_email', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                  {validationStates.reporter_email && (
                    <DFATraceViewer validationResult={validationStates.reporter_email} title="Email DFA Engine" />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Phone Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit number e.g. 9876543210"
                    value={formData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                  {validationStates.phone && (
                    <DFATraceViewer validationResult={validationStates.phone} title="Phone DFA Engine" />
                  )}
                </div>
              </div>
            </div>

            {/* 2. Vehicle Details Card */}
            <div className="bg-slate-900/70 rounded-xl border border-slate-800 p-5 shadow-sm">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-800/80">
                <Car className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-200">2. Target Vehicle Details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-300">
                      Vehicle Registration Number <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[10px] text-blue-400 font-mono">DFA Formal Pattern</span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="DL-01-AB-1234 or CA12XY9876"
                    value={formData.vehicle_number}
                    onChange={(e) => handleFieldChange('vehicle_number', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono uppercase placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                  {validationStates.vehicle_number && (
                    <DFATraceViewer validationResult={validationStates.vehicle_number} title="License Plate DFA" />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Vehicle Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => handleFieldChange('vehicle_type', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition cursor-pointer"
                  >
                    {(metadata?.vehicle_types || [
                      "Sedan", "SUV / Crossover", "Truck / Heavy Commercial",
                      "Motorcycle / Scooter", "Van / Minibus", "Electric Vehicle (EV)"
                    ]).map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Violation Details Card */}
            <div className="bg-slate-900/70 rounded-xl border border-slate-800 p-5 shadow-sm">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-800/80">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-200">3. Violation Incident Observations</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Location / Zone <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.zone}
                    onChange={(e) => handleFieldChange('zone', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition cursor-pointer"
                  >
                    {(metadata?.zones || [
                      "Zone A - Downtown Commercial",
                      "Zone B - Residential North",
                      "Zone C - Hospital & Transit Hub",
                      "Zone D - Industrial & Port",
                      "Zone E - Waterfront & Entertainment"
                    ]).map((z) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Structured Violation Code <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.violation_code}
                    onChange={(e) => handleFieldChange('violation_code', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition cursor-pointer"
                  >
                    <option value="PV05">PV05 (Traffic Obstruction - Fire Hydrant / Emergency)</option>
                    <option value="PV03">PV03 (Parking Space Misuse - Disabled / EV Bay)</option>
                    <option value="PV01">PV01 (No-Parking Zone Violation - Red Curb / Clearway)</option>
                    <option value="PV02">PV02 (Improper Parking - Double Parking / Curb Straddle)</option>
                    <option value="PV04">PV04 (Overstay Violation - Meter Expired &gt; 2 Hours)</option>
                  </select>
                  {validationStates.violation_code && (
                    <DFATraceViewer validationResult={validationStates.violation_code} title="Violation Code DFA" />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Reporter Urgency Rating <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.urgency_level}
                    onChange={(e) => handleFieldChange('urgency_level', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition cursor-pointer"
                  >
                    <option value="Critical">Critical (Immediate Danger / Blockage)</option>
                    <option value="High">High (High Congestion / Accessibility)</option>
                    <option value="Medium">Medium (Standard Violation)</option>
                    <option value="Low">Low (Minor Overstay)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Incident Description &amp; Specific Landmarks <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe exact vehicle position, visible hazards, blocked infrastructure (e.g. blocking fire hydrant, parked on wheelchair ramp, straddling lines)..."
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Intelligent Pre-Submission Classifier Card */}
          <div className="space-y-6">
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-xl border border-blue-500/30 p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-800">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Automated Engine Preview</h3>
              </div>

              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                PARKGUARD's deterministic rule engine dynamically analyzes violation codes and keywords to determine priority and dispatch classification before saving.
              </p>

              <div className="space-y-3">
                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[11px] font-medium text-slate-400 block mb-1">Detected Category:</span>
                  <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    {previewClassification.category}
                  </span>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[11px] font-medium text-slate-400 block mb-1.5">Computed Priority Level:</span>
                  <PriorityBadge priority={previewClassification.priority} size="lg" />
                </div>

                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 text-xs">
                  <span className="text-[11px] font-medium text-slate-400 block mb-1">Precedence Logic:</span>
                  <p className="text-[11px] text-slate-300 italic leading-snug">
                    "{previewClassification.reason}"
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Target Zone:</span>
                  <span className="font-semibold text-slate-200">{formData.zone.split(' - ')[0]}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Routing Protocol:</span>
                  <span className="font-semibold text-emerald-400">Primary + Backup Failover</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-6 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Validating &amp; Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit &amp; Dispatch Report</span>
                  </>
                )}
              </button>
            </div>

            {/* Centralized Categories Reference */}
            <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 text-xs">
              <h4 className="font-semibold text-slate-300 mb-2">Centralized 5-Category Standards (PV01 - PV05):</h4>
              <ul className="space-y-1.5 text-slate-400 text-[11px]">
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <strong>PV05 — Traffic Obstruction:</strong> Fire hydrants, clearways
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <strong>PV03 — Parking Space Misuse:</strong> Disabled stalls, EV bays
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <strong>PV01 — No-Parking Zone Violation:</strong> Red curb, tow corridors
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <strong>PV02 — Improper Parking:</strong> Double parked, straddling lines
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <strong>PV04 — Overstay Violation:</strong> Meter expired &gt; 2 hrs
                </li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

