import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import { Navbar } from './components/Navbar';
import { ReportSubmissionPage } from './pages/ReportSubmissionPage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { HandlerDashboardPage } from './pages/HandlerDashboardPage';
import { RoutingManagementPage } from './pages/RoutingManagementPage';
import { AnalyticsDashboardPage } from './pages/AnalyticsDashboardPage';
import { DFASimulatorPage } from './pages/DFASimulatorPage';
import { ShieldCheck } from 'lucide-react';

export function App() {
  const [criticalCount, setCriticalCount] = useState(0);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#070d1e] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
          
          {/* Global Navigation Bar */}
          <Navbar onCriticalCountUpdate={setCriticalCount} />

          {/* Dynamic Page Routes */}
          <main className="flex-1 pb-16">
            <Routes>
              <Route path="/" element={<ReportSubmissionPage />} />
              <Route path="/user" element={<UserDashboardPage />} />
              <Route path="/handler" element={<HandlerDashboardPage />} />
              <Route path="/routing" element={<RoutingManagementPage />} />
              <Route path="/analytics" element={<AnalyticsDashboardPage />} />
              <Route path="/dfa-simulator" element={<DFASimulatorPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Global Professional Footer */}
          <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 text-xs text-slate-500 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <span className="font-bold text-slate-400">PARKGUARD</span>
                <span>— Intelligent Parking Violation Management System</span>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span>Formal DFA &amp; Regex Engine</span>
                <span>•</span>
                <span>Deterministic Priority Hierarchy</span>
                <span>•</span>
                <span>SQLite + Flask REST Architecture</span>
              </div>
            </div>
          </footer>

        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
