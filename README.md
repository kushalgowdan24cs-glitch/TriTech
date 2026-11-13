# PARKGUARD — Intelligent Parking Violation Management System
### Enterprise-Grade Full-Stack Civic Enforcement & Dispatch Platform

---

## 1. System Overview

**PARKGUARD** is an end-to-end, full-stack municipal parking violation management platform built for municipal governments and traffic enforcement departments. Designed with inspiration from modern SaaS platforms (Linear, Stripe, Vercel), PARKGUARD replaces paper ticketing and fragmented reporting with an automated, explainable, and mathematically verified dispatch pipeline.

### Core Capabilities:
- **Formal DFA State Transition Simulation:** Real-time state-transition validation of vehicle registration numbers, violation taxonomy codes, phone numbers, and emails with step-by-step trace auditing.
- **Equivalent Regex Validation:** Simultaneous dual-engine execution guaranteeing formal mathematical agreement ($L(DFA) \equiv L(Regex)$).
- **Automated 5-Category Classification:** Deterministic keyword and code matching with life-safety emergency preemption hierarchy.
- **Intelligent Dispatch Routing Algorithm:** Real-time assignment based on handler specializations, geographic zones, on-duty status, capacity limits, and active load balancing with automatic failover to designated backup officers.
- **Priority-Based Dispatch Buffer & Escalation:** Critical/High violations automatically jump the queue; saturated zones trigger immediate supervisor escalation.
- **Citizen Transparency Portal:** End-to-end lifecycle status timeline: `Submitted` → `Validated` → `Classified` → `Assigned` → `In Progress` → `Resolved`.
- **Enforcement Officer Management Deck:** Dynamic on/off duty toggling, maximum caseload thresholds, and one-click status transitions with automatic capacity recalculation.
- **Live Recharts Analytics:** Multidimensional distributions, zone heatmaps, handler load comparison, resolution ratios, and one-click CSV export.

---

## 2. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, Lucide React, Recharts, React Router v7 |
| **Backend** | Python 3.10+, Flask REST API, Flask-CORS |
| **Database** | SQLite 3 with enforced Foreign Keys and relational indices |
| **Formal Automata** | Deterministic Finite Automaton (DFA) state transition simulator |
| **Testing** | Pytest, 17 executable test cases covering all edge cases |

---

## 3. Five-Category Violation Taxonomy

The platform standardizes enforcement on exactly **five** centralized categories:

1. **Traffic Obstruction (`TOB`):** Blocking fire hydrants, emergency lanes, crosswalks, tram tracks, or active roadways. *(Default Priority: Critical)*
2. **Parking Space Misuse (`PSM`):** Unauthorized parking in disabled/handicapped stalls or blocking EV fast chargers. *(Default Priority: High)*
3. **No-Parking Zone Violation (`NPZ`):** Red curb corridors, tow-away zones, bus stops, or strict no-parking areas. *(Default Priority: Medium)*
4. **Improper Parking (`IMP`):** Double parking, diagonal straddling, curb mounting, or sidewalk obstruction. *(Default Priority: Medium)*
5. **Overstay Violation (`OST`):** Expired municipal meters or exceeding posted time limits. *(Default Priority: Low)*

### Deterministic Conflict Resolution Hierarchy:
When an incident description matches multiple patterns, PARKGUARD enforces a deterministic safety precedence:
$$\text{Traffic Obstruction} \succ \text{Parking Space Misuse} \succ \text{No-Parking Zone Violation} \succ \text{Improper Parking} \succ \text{Overstay Violation}$$
Any mention of life-safety keywords (e.g., *fire hydrant*, *ambulance*, *emergency*) immediately overrides standard taxonomy and forces **Critical Priority**.

---

## 4. Formal DFA Automaton Construction

PARKGUARD implements a formal state machine simulator $M = (Q, \Sigma, \delta, q_0, F)$:

### Vehicle License Plate DFA:
- **Alphabet $\Sigma$:** Uppercase letters `[A-Z]`, digits `[0-9]`, separators `[- ]`
- **States $Q$:** `Q_START`, `Q_L1`, `Q_L2`, `Q_SEP1`, `Q_D1`, `Q_D2`, `Q_SEP2`, `Q_S1`, `Q_S2`, `Q_SEP3`, `Q_N1`, `Q_N2`, `Q_N3`, `Q_ACCEPT`, `TRAP`
- **Accept States $F$:** `{ Q_ACCEPT }`
- **Equivalent Regex:** `^[A-Z]{2}[- ]?[0-9]{2}[- ]?[A-Z]{1,2}[- ]?[0-9]{4}$`

### Violation Code DFA:
- **States $Q$:** `V_START`, `V_N`, `V_NP`, `V_I`, `V_IM`, `V_P`, `V_PS`, `V_O`, `V_OS`, `V_T`, `V_TO`, `V_CAT_DONE`, `V_HYPHEN`, `V_D1`, `V_D2`, `V_ACCEPT`, `TRAP`
- **Accept States $F$:** `{ V_ACCEPT }`
- **Equivalent Regex:** `^(NPZ|IMP|PSM|OST|TOB)-[0-9]{3}$`

Dual execution runs in real time on both client and server, reporting exact agreement ($L(DFA) \equiv L(Regex)$), character-by-character transition traces, and step count.

---

## 5. Intelligent Routing & Dispatch Algorithm

```
                 [ Citizen Incident Report ]
                              │
               ▼ (DFA & Regex Validation)
               ▼ (Category & Priority Classification)
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
       Rule Lookup:                    No Direct Rule:
   (Category, Zone) Rule            Fallback to Zone Fleet
               │                             │
    Is Primary Handler Free?                 │
    (Avail=1 & Load < Cap)                   │
         ├── YES ──► Assign to Primary       │
         └── NO                              │
              │                              │
    Is Backup Handler Free?                  │
    (Avail=1 & Load < Cap)                   │
         ├── YES ──► Assign to Backup        │
         └── NO                              │
              │                              │
              ▼                              ▼
    Any Eligible Officer with Spare Capacity in Fleet?
         ├── YES ──► Assign to Lowest Workload Officer
         └── NO
              │
    Is Priority Critical or High?
         ├── YES ──► Mark 'Escalated' (Urgent Supervisor Alert)
         └── NO  ──► Enqueue into Priority Buffer ('Submitted')
```

### Priority Override & Queue Reprocessing:
When an officer resolves a citation or increases capacity, the priority queue is automatically re-evaluated:
1. **Primary Ordering:** Priority Weight ($\text{Critical} = 4, \text{High} = 3, \text{Medium} = 2, \text{Low} = 1$)
2. **Secondary Ordering:** Timestamp FIFO ($\text{created\_at ASC}$)

---

## 6. Database Schema (SQLite)

- **`handlers`**: id, name, categories (JSON), assigned_zone, availability (0/1), capacity, current_load.
- **`reports`**: id, report_id (UNIQUE), reporter_name, reporter_email, phone, vehicle_number, vehicle_type, violation_code, category, zone, description, priority, status, assigned_handler_id (FK), created_at, updated_at.
- **`routing_rules`**: id, category, zone, primary_handler_id (FK), backup_handler_id (FK).
- **`status_history`**: id, report_id, old_status, new_status, updated_by, timestamp.
- **`routing_logs`**: id, report_id, handler_id (FK), routing_reason, escalation_reason, timestamp.

---

## 7. REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend and database connectivity status |
| `GET` | `/api/meta` | Centralized categories, codes, zones, vehicle types |
| `POST` | `/api/validate` | Real-time interactive DFA & Regex validation with execution trace |
| `POST` | `/api/reports` | Submit report: validate → classify → ID gen → route → persist |
| `GET` | `/api/reports` | Query reports with search, zone, category, and status filters |
| `GET` | `/api/reports/<id>` | Full report dossier with status timeline and routing audit logs |
| `PUT` | `/api/reports/<id>/status` | Update status: recalculates officer loads and triggers queue dispatch |
| `GET` | `/api/handlers` | Fetch all officers with live workload and capacity metrics |
| `PUT` | `/api/handlers/<id>` | Toggle availability (On/Off duty) and update maximum capacity |
| `GET` | `/api/routing` | Routing rules matrix, handler fleet, queued reports, and audit logs |
| `POST` | `/api/routing/reprocess` | Manually trigger priority queue re-evaluation |
| `GET` | `/api/dashboard/stats` | High-level summary KPI counters |
| `GET` | `/api/analytics` | Multidimensional aggregated metrics for Recharts |
| `GET` | `/api/export` | Download complete enforcement dataset in CSV format |

---

## 8. Test Suite Coverage (17 Scenarios)

Run executable test suite:
```bash
python -m pytest backend/tests/test_parkguard.py -v
```

1. **Valid Vehicle Registration:** Verifies DFA & Regex acceptance for `DL-01-AB-1234`, `CA 12 XY 9876`, `NY04A1234`.
2. **Invalid Vehicle Registration:** Rejection and sink/trap transitions for malformed license plates.
3. **Valid Phone Number:** Verifies acceptance of standard 10-12 digit numbers with optional `+`.
4. **Invalid Phone Number:** Rejection of non-numeric, short, or oversized inputs.
5. **Regex and DFA Agreement:** Tests identical truth value across all valid and invalid inputs.
6. **Correct 5-Category Classification:** Tests precise classification for all 5 categories.
7. **Conflicting Classification Patterns:** Verifies life-safety emergency keyword preemption.
8. **Invalid Violation Code:** Rejection of non-catalog or malformed taxonomy strings.
9. **Unknown Routing Zone:** Fallback to general fleet or priority queuing.
10. **Available Handler Assignment:** Direct assignment to primary zone specialist.
11. **Unavailable Handler Handling:** Rerouting to designated backup when primary is off-duty.
12. **Handler Capacity Overflow:** Automatic protection against overbooking saturated handlers.
13. **Backup Handler Assignment:** Failover to backup when primary is at full capacity ($Load = Cap$).
14. **Critical Priority Override:** Immediate escalation trigger when all zone officers are saturated.
15. **Queue Ordering (Priority + FIFO):** Critical reports jump ahead of older medium/low reports.
16. **Report Status Update & Load Recalculation:** Automatic handler load decrement upon case resolution.
17. **Database Persistence After Restart:** Verifies SQLite transactional durability after closing connection.

---

## 9. Quickstart Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Install Dependencies
```bash
# Backend
pip install -r backend/requirements.txt

# Frontend
cd frontend
npm install
cd ..
```

### 2. Initialize Database
```bash
python backend/init_db.py --force
```

### 3. Launch PARKGUARD
Run both backend and frontend concurrently:
```bash
python run.py
```
- **Web Dashboard:** [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **REST API Gateway:** [http://127.0.0.1:5000/api/health](http://127.0.0.1:5000/api/health)
