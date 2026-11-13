/**
 * PARKGUARD - Centralized API Service Layer
 * Interfaces with Flask REST backend endpoints.
 */

const API_BASE = '/api';

export const api = {
  // System & Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  async getMetadata() {
    const res = await fetch(`${API_BASE}/meta`);
    return res.json();
  },

  // Real-time DFA & Regex Validation
  async validateField(fieldName, value) {
    const res = await fetch(`${API_BASE}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field: fieldName, value })
    });
    return res.json();
  },

  // Reports
  async submitReport(payload) {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getReports(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'all') {
        query.append(k, v);
      }
    });
    const url = `${API_BASE}/reports${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url);
    return res.json();
  },

  async getReportDetails(reportId) {
    const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportId)}`);
    return res.json();
  },

  async updateReportStatus(reportId, status, updatedBy = 'Officer in Charge') {
    const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(reportId)}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, updated_by: updatedBy })
    });
    return res.json();
  },

  // Handlers
  async getHandlers() {
    const res = await fetch(`${API_BASE}/handlers`);
    return res.json();
  },

  async updateHandler(handlerId, availability, capacity) {
    const res = await fetch(`${API_BASE}/handlers/${handlerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availability, capacity })
    });
    return res.json();
  },

  // Routing
  async getRoutingOverview() {
    const res = await fetch(`${API_BASE}/routing`);
    return res.json();
  },

  async reprocessQueue() {
    const res = await fetch(`${API_BASE}/routing/reprocess`, {
      method: 'POST'
    });
    return res.json();
  },

  // Dashboard & Analytics
  async getDashboardStats() {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    return res.json();
  },

  async getAnalytics(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'all') {
        query.append(k, v);
      }
    });
    const url = `${API_BASE}/analytics${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url);
    return res.json();
  },

  // CSV Export
  getExportUrl() {
    return `${API_BASE}/export`;
  }
};

