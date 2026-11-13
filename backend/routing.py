"""
PARKGUARD - Intelligent Report Dispatch and Routing Engine
Evaluates routing rules, handler availability, capacity thresholds,
load distribution, priority overrides, and explainable decision auditing.
"""

import sqlite3
import json
from datetime import datetime
from typing import Dict, Any, Optional, Tuple, List
from models import PRIORITY_LEVELS

def execute_routing_algorithm(
    report_id: str,
    category: str,
    zone: str,
    priority: str,
    conn: sqlite3.Connection
) -> Dict[str, Any]:
    """
    Executes the multi-stage routing algorithm for a parking violation report:
    1. Query routing table for (category, zone) rule.
    2. Check primary handler availability & capacity.
    3. If primary full/unavailable, evaluate designated backup handler.
    4. If backup full/unavailable, evaluate any available zone-compatible handler.
    5. If all full/unavailable, place in priority queue or escalate if Critical/High.
    6. Persist decision in routing_logs and update report status.
    """
    cursor = conn.cursor()

    # Step 1: Look up specific routing rule
    cursor.execute("""
        SELECT rr.id, rr.category, rr.zone,
               rr.primary_handler_id, rr.backup_handler_id,
               h1.name as primary_name, h1.availability as primary_avail,
               h1.capacity as primary_cap, h1.current_load as primary_load,
               h2.name as backup_name, h2.availability as backup_avail,
               h2.capacity as backup_cap, h2.current_load as backup_load
        FROM routing_rules rr
        JOIN handlers h1 ON rr.primary_handler_id = h1.id
        JOIN handlers h2 ON rr.backup_handler_id = h2.id
        WHERE rr.category = ? AND rr.zone = ?;
    """, (category, zone))

    rule = cursor.fetchone()

    assigned_handler_id = None
    assigned_handler_name = None
    new_status = "Assigned"
    routing_reason = ""
    escalation_reason = None
    is_backup_assignment = False

    if rule:
        # Check Primary Handler
        primary_ok = (rule["primary_avail"] == 1) and (rule["primary_load"] < rule["primary_cap"])

        if primary_ok:
            assigned_handler_id = rule["primary_handler_id"]
            assigned_handler_name = rule["primary_name"]
            routing_reason = (
                f"Assigned to primary specialist {rule['primary_name']}. "
                f"Handler is active with available capacity ({rule['primary_load']}/{rule['primary_cap']})."
            )
        else:
            primary_issue = "unavailable (off-duty)" if rule["primary_avail"] == 0 else f"at full capacity ({rule['primary_load']}/{rule['primary_cap']})"

            # Check Backup Handler
            backup_ok = (rule["backup_avail"] == 1) and (rule["backup_load"] < rule["backup_cap"])

            if backup_ok:
                assigned_handler_id = rule["backup_handler_id"]
                assigned_handler_name = rule["backup_name"]
                is_backup_assignment = True
                routing_reason = (
                    f"Designated primary {rule['primary_name']} is {primary_issue}. "
                    f"Rerouted to backup handler {rule['backup_name']} with capacity ({rule['backup_load']}/{rule['backup_cap']})."
                )
            else:
                backup_issue = "unavailable" if rule["backup_avail"] == 0 else f"at full capacity ({rule['backup_load']}/{rule['backup_cap']})"
                # Fallback to pool search
                assigned_handler_id, assigned_handler_name, routing_reason = _find_best_alternative_handler(
                    cursor, category, zone
                )
                if not assigned_handler_id:
                    # Both rule handlers and alternatives unavailable
                    if priority in ("Critical", "High"):
                        new_status = "Escalated"
                        escalation_reason = (
                            f"Priority Escalation triggered! Primary ({rule['primary_name']}: {primary_issue}) "
                            f"and Backup ({rule['backup_name']}: {backup_issue}) are saturated. "
                            f"Immediate supervisor intervention mandated for {priority} urgency."
                        )
                        routing_reason = escalation_reason
                    else:
                        new_status = "Submitted"
                        escalation_reason = (
                            f"Queued in priority buffer. Primary ({rule['primary_name']}: {primary_issue}) "
                            f"and Backup ({rule['backup_name']}: {backup_issue}) at maximum capacity."
                        )
                        routing_reason = escalation_reason
    else:
        # No direct rule for (category, zone), attempt general matching
        assigned_handler_id, assigned_handler_name, routing_reason = _find_best_alternative_handler(
            cursor, category, zone
        )
        if not assigned_handler_id:
            if priority in ("Critical", "High"):
                new_status = "Escalated"
                escalation_reason = f"No rule or available handler for zone '{zone}'. Priority {priority} forced escalation."
                routing_reason = escalation_reason
            else:
                new_status = "Submitted"
                escalation_reason = f"No available handler found for zone '{zone}'. Added to dispatch queue."
                routing_reason = escalation_reason

    # Step 2: Apply Priority Preemption / Overrides if necessary
    # If Critical and assigned, prepend note
    if priority == "Critical" and assigned_handler_id:
        routing_reason = f"[CRITICAL EXPEDITE] {routing_reason}"

    # Step 3: Update Report Record in DB
    now_iso = datetime.now().isoformat()
    cursor.execute("""
        UPDATE reports
        SET status = ?, assigned_handler_id = ?, updated_at = ?
        WHERE report_id = ?;
    """, (new_status, assigned_handler_id, now_iso, report_id))

    # Step 4: Record in Status History
    cursor.execute("""
        INSERT INTO status_history (report_id, old_status, new_status, updated_by, timestamp)
        VALUES (?, 'Validated', ?, 'PARKGUARD Routing Engine', ?);
    """, (report_id, new_status, now_iso))

    # Step 5: Record in Routing Logs
    cursor.execute("""
        INSERT INTO routing_logs (report_id, handler_id, routing_reason, escalation_reason, timestamp)
        VALUES (?, ?, ?, ?, ?);
    """, (report_id, assigned_handler_id, routing_reason, escalation_reason, now_iso))

    # Step 6: Recalculate Handler Load
    if assigned_handler_id:
        cursor.execute("""
            UPDATE handlers
            SET current_load = (
                SELECT COUNT(*) FROM reports
                WHERE assigned_handler_id = ? AND status IN ('Assigned', 'In Progress')
            )
            WHERE id = ?;
        """, (assigned_handler_id, assigned_handler_id))

    conn.commit()

    return {
        "report_id": report_id,
        "assigned_handler_id": assigned_handler_id,
        "assigned_handler_name": assigned_handler_name,
        "status": new_status,
        "routing_reason": routing_reason,
        "escalation_reason": escalation_reason,
        "is_backup": is_backup_assignment
    }


def _find_best_alternative_handler(
    cursor: sqlite3.Cursor,
    category: str,
    zone: str
) -> Tuple[Optional[int], Optional[str], str]:
    """
    Finds the best alternative handler by lowest active load who is available
    and has spare capacity.
    """
    cursor.execute("""
        SELECT id, name, capacity, current_load, assigned_zone, categories
        FROM handlers
        WHERE availability = 1 AND current_load < capacity
        ORDER BY (capacity - current_load) DESC, current_load ASC;
    """)
    candidates = cursor.fetchall()

    if not candidates:
        return None, None, "No active handlers possess spare capacity in the system."

    # Prefer handler assigned to same zone
    for c in candidates:
        if c["assigned_zone"] == zone:
            return (
                c["id"],
                c["name"],
                f"Alternative assignment: Same-zone officer {c['name']} selected based on lowest workload ({c['current_load']}/{c['capacity']})."
            )

    # Secondary: handler whose categories cover this category
    for c in candidates:
        try:
            cats = json.loads(c["categories"])
            if category in cats:
                return (
                    c["id"],
                    c["name"],
                    f"Alternative assignment: Cross-zone specialist {c['name']} assigned with workload ({c['current_load']}/{c['capacity']})."
                )
        except Exception:
            pass

    # Tertiary: any candidate with lowest load
    best = candidates[0]
    return (
        best["id"],
        best["name"],
        f"Contingency dispatch: Handled by available officer {best['name']} with workload ({best['current_load']}/{best['capacity']})."
    )


def reprocess_priority_queue(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    """
    Evaluates queued and escalated reports ordered strictly by:
    1. Priority level descending (Critical=4, High=3, Medium=2, Low=1)
    2. Submission time ascending (FIFO secondary condition)
    Re-attempts dispatch if capacity has opened up.
    """
    cursor = conn.cursor()
    cursor.execute("""
        SELECT report_id, category, zone, priority, created_at, status
        FROM reports
        WHERE status IN ('Submitted', 'Escalated')
        ORDER BY 
            CASE priority
                WHEN 'Critical' THEN 1
                WHEN 'High' THEN 2
                WHEN 'Medium' THEN 3
                WHEN 'Low' THEN 4
                ELSE 5
            END ASC,
            created_at ASC;
    """)
    queued_reports = cursor.fetchall()
    results = []

    for r in queued_reports:
        res = execute_routing_algorithm(
            report_id=r["report_id"],
            category=r["category"],
            zone=r["zone"],
            priority=r["priority"],
            conn=conn
        )
        if res["status"] == "Assigned":
            results.append(res)

    return results
