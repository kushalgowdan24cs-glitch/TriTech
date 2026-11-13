"""
PARKGUARD - REST API Gateway (Flask)
Intelligent Parking Violation Management System
"""

import os
import io
import csv
import json
from datetime import datetime
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS

from database import init_db, get_db_connection, recalculate_handler_loads
from models import (
    VIOLATION_CATEGORIES, VIOLATION_CODES, AVAILABLE_ZONES, 
    VEHICLE_TYPES, PRIORITY_LEVELS, STATUS_LIFECYCLE
)
from validation import (
    validate_report_submission, validate_field,
    vehicle_dfa, violation_code_dfa, phone_dfa, email_dfa
)
from classification import classify_violation, generate_unique_report_id
from routing import execute_routing_algorithm, reprocess_priority_queue
from analytics import get_analytics_metrics

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Ensure database tables and initial seeds exist
init_db()


# ==============================================================================
# SYSTEM & HEALTH ENDPOINTS
# ==============================================================================
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "system": "PARKGUARD",
        "tagline": "Intelligent Parking Violation Management System",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "database": "SQLite (Connected)"
    }), 200


@app.route("/api/meta", methods=["GET"])
def get_metadata():
    """Provides centralized master configurations for UI dropdowns and badges."""
    return jsonify({
        "categories": list(VIOLATION_CATEGORIES.values()),
        "violation_codes": [
            {"code": k, **v} for k, v in VIOLATION_CODES.items()
        ],
        "zones": AVAILABLE_ZONES,
        "vehicle_types": VEHICLE_TYPES,
        "priority_levels": list(PRIORITY_LEVELS.keys()),
        "status_lifecycle": STATUS_LIFECYCLE
    }), 200


# ==============================================================================
# VALIDATION ENGINE (LIVE DFA & REGEX)
# ==============================================================================
@app.route("/api/validate", methods=["POST"])
def validate_single_field():
    """
    Real-time interactive validation endpoint.
    Performs simultaneous DFA state simulation and Regex validation,
    returning full state trace, step count, and agreement verification.
    """
    data = request.get_json() or {}
    field_name = data.get("field", "")
    value = data.get("value", "")

    result = validate_field(field_name, value)
    return jsonify(result), 200


# ==============================================================================
# REPORT SUBMISSION & MANAGEMENT
# ==============================================================================
@app.route("/api/reports", methods=["POST"])
def submit_report():
    """
    STEP 1: Validate input using DFA and Regex.
    STEP 2: Classify category & urgency.
    STEP 3: Generate unique Report ID.
    STEP 4: Execute intelligent routing algorithm.
    STEP 5: Save record, status history, and routing log.
    """
    payload = request.get_json() or {}
    
    # 1. Validation Engine
    is_valid, validation_details, errors = validate_report_submission(payload)
    if not is_valid:
        return jsonify({
            "success": False,
            "error": "Validation failed",
            "errors": errors,
            "validation_details": validation_details
        }), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 2. Classification & Priority Determination
        violation_code = payload.get("violation_code", "").strip().upper()
        description = payload.get("description", "").strip()
        urgency_input = payload.get("urgency_level", payload.get("priority", "Medium"))

        classification_res = classify_violation(
            violation_code=violation_code,
            description=description,
            urgency_input=urgency_input
        )

        detected_category = classification_res["category"]
        detected_priority = classification_res["priority"]

        # 3. Unique Report ID Generation
        report_id = generate_unique_report_id(cursor)

        # 4. Save initial report
        now_iso = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO reports (
                report_id, reporter_name, reporter_email, phone,
                vehicle_number, vehicle_type, violation_code,
                category, zone, description, priority,
                status, assigned_handler_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Validated', NULL, ?, ?);
        """, (
            report_id,
            payload.get("reporter_name", "").strip(),
            payload.get("reporter_email", "").strip(),
            payload.get("phone", "").strip(),
            payload.get("vehicle_number", "").strip().upper(),
            payload.get("vehicle_type", "Sedan"),
            violation_code,
            detected_category,
            payload.get("zone", AVAILABLE_ZONES[0]),
            description,
            detected_priority,
            now_iso,
            now_iso
        ))

        # Record Initial Status History
        cursor.execute("""
            INSERT INTO status_history (report_id, old_status, new_status, updated_by, timestamp)
            VALUES (?, 'Submitted', 'Validated', 'Automated DFA/Regex Validator', ?);
        """, (report_id, now_iso))

        conn.commit()

        # 5. Execute Intelligent Routing Algorithm
        routing_result = execute_routing_algorithm(
            report_id=report_id,
            category=detected_category,
            zone=payload.get("zone", AVAILABLE_ZONES[0]),
            priority=detected_priority,
            conn=conn
        )

        # Fetch fully saved report
        cursor.execute("""
            SELECT r.*, h.name as handler_name, h.assigned_zone as handler_zone
            FROM reports r
            LEFT JOIN handlers h ON r.assigned_handler_id = h.id
            WHERE r.report_id = ?;
        """, (report_id,))
        saved_row = cursor.fetchone()

        conn.close()

        return jsonify({
            "success": True,
            "message": "Violation report successfully processed and routed.",
            "report": dict(saved_row) if saved_row else None,
            "classification": classification_res,
            "routing": routing_result,
            "validation": validation_details
        }), 201

    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/reports", methods=["GET"])
def get_reports():
    """
    Returns list of reports with optional filtering by status, zone,
    priority, category, or search query (by report_id, vehicle_number, reporter).
    """
    status = request.args.get("status")
    zone = request.args.get("zone")
    priority = request.args.get("priority")
    category = request.args.get("category")
    search = request.args.get("search")
    handler_id = request.args.get("handler_id")

    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT r.*, h.name as handler_name
        FROM reports r
        LEFT JOIN handlers h ON r.assigned_handler_id = h.id
        WHERE 1=1
    """
    params = []

    if status and status != "all":
        query += " AND r.status = ?"
        params.append(status)

    if zone and zone != "all":
        query += " AND r.zone = ?"
        params.append(zone)

    if priority and priority != "all":
        query += " AND r.priority = ?"
        params.append(priority)

    if category and category != "all":
        query += " AND r.category = ?"
        params.append(category)

    if handler_id and handler_id != "all":
        query += " AND r.assigned_handler_id = ?"
        params.append(int(handler_id))

    if search:
        search_pattern = f"%{search.strip()}%"
        query += " AND (r.report_id LIKE ? OR r.vehicle_number LIKE ? OR r.reporter_name LIKE ? OR r.description LIKE ?)"
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern])

    query += " ORDER BY r.created_at DESC;"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    reports = [dict(row) for row in rows]

    conn.close()
    return jsonify({"success": True, "count": len(reports), "reports": reports}), 200


@app.route("/api/reports/<report_id>", methods=["GET"])
def get_report_details(report_id):
    """
    Returns detailed report information including lifecycle status history,
    routing logs, and assigned officer profile.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT r.*, h.name as handler_name, h.assigned_zone as handler_zone, h.current_load, h.capacity
        FROM reports r
        LEFT JOIN handlers h ON r.assigned_handler_id = h.id
        WHERE r.report_id = ?;
    """, (report_id,))
    report_row = cursor.fetchone()

    if not report_row:
        conn.close()
        return jsonify({"success": False, "error": f"Report '{report_id}' not found"}), 404

    # Fetch status history
    cursor.execute("""
        SELECT * FROM status_history
        WHERE report_id = ?
        ORDER BY timestamp ASC;
    """, (report_id,))
    history_rows = cursor.fetchall()

    # Fetch routing logs
    cursor.execute("""
        SELECT rl.*, h.name as handler_name
        FROM routing_logs rl
        LEFT JOIN handlers h ON rl.handler_id = h.id
        WHERE rl.report_id = ?
        ORDER BY rl.timestamp ASC;
    """, (report_id,))
    log_rows = cursor.fetchall()

    conn.close()

    return jsonify({
        "success": True,
        "report": dict(report_row),
        "status_history": [dict(h) for h in history_rows],
        "routing_logs": [dict(l) for l in log_rows]
    }), 200


@app.route("/api/reports/<report_id>/status", methods=["PUT"])
def update_report_status(report_id):
    """
    Updates the lifecycle status of a report (e.g., In Progress, Resolved).
    Records change in status_history and recalculates handler workloads.
    If resolved, re-triggers queue evaluation for waiting reports.
    """
    payload = request.get_json() or {}
    new_status = payload.get("status")
    updated_by = payload.get("updated_by", "Authorized Officer")

    if new_status not in STATUS_LIFECYCLE:
        return jsonify({
            "success": False,
            "error": f"Invalid status. Must be one of: {STATUS_LIFECYCLE}"
        }), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT status, assigned_handler_id FROM reports WHERE report_id = ?;", (report_id,))
    current = cursor.fetchone()

    if not current:
        conn.close()
        return jsonify({"success": False, "error": f"Report '{report_id}' not found"}), 404

    old_status = current["status"]
    now_iso = datetime.now().isoformat()

    cursor.execute("""
        UPDATE reports
        SET status = ?, updated_at = ?
        WHERE report_id = ?;
    """, (new_status, now_iso, report_id))

    cursor.execute("""
        INSERT INTO status_history (report_id, old_status, new_status, updated_by, timestamp)
        VALUES (?, ?, ?, ?, ?);
    """, (report_id, old_status, new_status, updated_by, now_iso))

    conn.commit()

    # Recalculate handler loads
    recalculate_handler_loads(conn)

    # If report was resolved, capacity has freed up; evaluate queued/escalated reports
    reprocessed = []
    if new_status == "Resolved":
        reprocessed = reprocess_priority_queue(conn)

    conn.close()

    return jsonify({
        "success": True,
        "message": f"Status updated to '{new_status}' successfully.",
        "report_id": report_id,
        "old_status": old_status,
        "new_status": new_status,
        "reprocessed_queued_count": len(reprocessed)
    }), 200


# ==============================================================================
# HANDLER MANAGEMENT ENDPOINTS
# ==============================================================================
@app.route("/api/handlers", methods=["GET"])
def get_handlers():
    """Returns all enforcement handlers with their current live workload and capacity."""
    conn = get_db_connection()
    recalculate_handler_loads(conn)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT h.*,
               (SELECT COUNT(*) FROM reports WHERE assigned_handler_id = h.id AND status = 'In Progress') as in_progress_count,
               (SELECT COUNT(*) FROM reports WHERE assigned_handler_id = h.id AND status = 'Assigned') as assigned_count,
               (SELECT COUNT(*) FROM reports WHERE assigned_handler_id = h.id AND status = 'Resolved') as resolved_count
        FROM handlers h
        ORDER BY h.id ASC;
    """)
    rows = cursor.fetchall()
    handlers = []
    for r in rows:
        d = dict(r)
        try:
            d["categories"] = json.loads(d["categories"])
        except Exception:
            d["categories"] = [d["categories"]]
        handlers.append(d)

    conn.close()
    return jsonify({"success": True, "handlers": handlers}), 200


@app.route("/api/handlers/<int:handler_id>", methods=["PUT"])
def update_handler(handler_id):
    """
    Updates a handler's availability (Available/Unavailable) or capacity.
    Automatically re-evaluates the priority dispatch queue if availability or capacity opened up.
    """
    payload = request.get_json() or {}
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM handlers WHERE id = ?;", (handler_id,))
    handler = cursor.fetchone()

    if not handler:
        conn.close()
        return jsonify({"success": False, "error": f"Handler with ID {handler_id} not found"}), 404

    availability = payload.get("availability", handler["availability"])
    capacity = payload.get("capacity", handler["capacity"])

    try:
        availability = int(availability)
        capacity = int(capacity)
    except ValueError:
        conn.close()
        return jsonify({"success": False, "error": "Invalid format for availability or capacity"}), 400

    cursor.execute("""
        UPDATE handlers
        SET availability = ?, capacity = ?
        WHERE id = ?;
    """, (availability, capacity, handler_id))
    conn.commit()

    # If handler became available or capacity increased, try reprocessing waiting reports
    reprocessed = []
    if availability == 1 and capacity > handler["current_load"]:
        reprocessed = reprocess_priority_queue(conn)

    recalculate_handler_loads(conn)
    cursor.execute("SELECT * FROM handlers WHERE id = ?;", (handler_id,))
    updated_handler = dict(cursor.fetchone())
    try:
        updated_handler["categories"] = json.loads(updated_handler["categories"])
    except Exception:
        pass

    conn.close()

    return jsonify({
        "success": True,
        "message": "Handler configurations updated successfully.",
        "handler": updated_handler,
        "reprocessed_queued_count": len(reprocessed)
    }), 200


# ==============================================================================
# ROUTING MANAGEMENT & DISPATCH
# ==============================================================================
@app.route("/api/routing", methods=["GET"])
def get_routing_overview():
    """
    Returns full routing rules table, live handler workloads, queued reports,
    escalated reports, and recent routing logs.
    """
    conn = get_db_connection()
    recalculate_handler_loads(conn)
    cursor = conn.cursor()

    # 1. Routing Rules with Handler Names
    cursor.execute("""
        SELECT rr.id, rr.category, rr.zone,
               h1.id as primary_id, h1.name as primary_name, h1.current_load as primary_load, h1.capacity as primary_cap, h1.availability as primary_avail,
               h2.id as backup_id, h2.name as backup_name, h2.current_load as backup_load, h2.capacity as backup_cap, h2.availability as backup_avail
        FROM routing_rules rr
        JOIN handlers h1 ON rr.primary_handler_id = h1.id
        JOIN handlers h2 ON rr.backup_handler_id = h2.id
        ORDER BY rr.zone ASC, rr.category ASC;
    """)
    rules = [dict(r) for r in cursor.fetchall()]

    # 2. Handlers Summary
    cursor.execute("SELECT * FROM handlers ORDER BY current_load DESC;")
    handlers = [dict(h) for h in cursor.fetchall()]

    # 3. Queued & Escalated Reports
    cursor.execute("""
        SELECT * FROM reports
        WHERE status IN ('Submitted', 'Validated', 'Escalated')
        ORDER BY 
            CASE priority
                WHEN 'Critical' THEN 1
                WHEN 'High' THEN 2
                WHEN 'Medium' THEN 3
                WHEN 'Low' THEN 4
            END ASC,
            created_at ASC;
    """)
    queued = [dict(q) for q in cursor.fetchall()]

    # 4. Recent Routing Audit Logs
    cursor.execute("""
        SELECT rl.*, r.category, r.zone, r.priority, h.name as handler_name
        FROM routing_logs rl
        JOIN reports r ON rl.report_id = r.report_id
        LEFT JOIN handlers h ON rl.handler_id = h.id
        ORDER BY rl.timestamp DESC
        LIMIT 30;
    """)
    logs = [dict(l) for l in cursor.fetchall()]

    conn.close()

    return jsonify({
        "success": True,
        "routing_rules": rules,
        "handlers": handlers,
        "queued_reports": queued,
        "recent_logs": logs
    }), 200


@app.route("/api/routing/reprocess", methods=["POST"])
def trigger_reprocess():
    """Manually triggers priority-based re-dispatch of all queued reports."""
    conn = get_db_connection()
    reprocessed = reprocess_priority_queue(conn)
    conn.close()
    return jsonify({
        "success": True,
        "message": f"Processed queue. Re-dispatched {len(reprocessed)} reports.",
        "reprocessed": reprocessed
    }), 200


# ==============================================================================
# ANALYTICS & DASHBOARD STATS
# ==============================================================================
@app.route("/api/dashboard/stats", methods=["GET"])
def get_dashboard_stats():
    """Quick high-level counters for citizen and admin header metrics."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM reports;")
    total = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM reports WHERE status IN ('Submitted', 'Validated', 'Classified');")
    pending = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM reports WHERE status IN ('Assigned', 'In Progress');")
    assigned = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM reports WHERE status = 'Resolved';")
    resolved = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM reports WHERE status = 'Escalated';")
    escalated = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM reports WHERE priority = 'Critical' AND status != 'Resolved';")
    critical_active = cursor.fetchone()[0]

    conn.close()

    return jsonify({
        "success": True,
        "total_reports": total,
        "pending_reports": pending,
        "assigned_reports": assigned,
        "resolved_reports": resolved,
        "escalated_reports": escalated,
        "critical_active": critical_active
    }), 200


@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    """Full multidimensional analytics with optional filters."""
    zone = request.args.get("zone")
    category = request.args.get("category")
    priority = request.args.get("priority")
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")

    conn = get_db_connection()
    data = get_analytics_metrics(
        conn,
        zone=zone,
        category=category,
        priority=priority,
        date_from=date_from,
        date_to=date_to
    )
    conn.close()

    return jsonify({"success": True, **data}), 200


# ==============================================================================
# CSV EXPORT (HACKATHON IMPACT FEATURE)
# ==============================================================================
@app.route("/api/export", methods=["GET"])
def export_reports_csv():
    """Generates and streams a CSV export of all reports."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT r.report_id, r.created_at, r.reporter_name, r.reporter_email, r.phone,
               r.vehicle_number, r.vehicle_type, r.violation_code, r.category,
               r.zone, r.priority, r.status, h.name as assigned_officer, r.description
        FROM reports r
        LEFT JOIN handlers h ON r.assigned_handler_id = h.id
        ORDER BY r.created_at DESC;
    """)
    rows = cursor.fetchall()
    conn.close()

    si = io.StringIO()
    cw = csv.writer(si)
    cw.writerow([
        "Report ID", "Timestamp", "Reporter Name", "Reporter Email", "Phone",
        "Vehicle Number", "Vehicle Type", "Violation Code", "Category",
        "Zone", "Priority", "Status", "Assigned Officer", "Description"
    ])

    for row in rows:
        cw.writerow(list(row))

    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=parkguard_reports.csv"
    output.headers["Content-type"] = "text/csv"
    return output


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)

