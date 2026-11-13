"""
PARKGUARD - Analytics & Reporting Data Engine
Computes real-time metrics, distributions, handler utilization,
and multi-dimensional query aggregations backed by SQLite.
"""

import sqlite3
from typing import Dict, Any, Optional

def get_analytics_metrics(
    conn: sqlite3.Connection,
    zone: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
) -> Dict[str, Any]:
    cursor = conn.cursor()

    # Dynamic filter construction
    where_clauses = []
    params = []

    if zone and zone != "all":
        where_clauses.append("zone = ?")
        params.append(zone)

    if category and category != "all":
        where_clauses.append("category = ?")
        params.append(category)

    if priority and priority != "all":
        where_clauses.append("priority = ?")
        params.append(priority)

    if date_from:
        where_clauses.append("DATE(created_at) >= DATE(?)")
        params.append(date_from)

    if date_to:
        where_clauses.append("DATE(created_at) <= DATE(?)")
        params.append(date_to)

    filter_sql = ""
    if where_clauses:
        filter_sql = "WHERE " + " AND ".join(where_clauses)

    # 1. Core Summary Counters
    cursor.execute(f"SELECT COUNT(*) FROM reports {filter_sql};", params)
    total_reports = cursor.fetchone()[0]

    cursor.execute(f"SELECT COUNT(*) FROM reports {filter_sql} {'AND' if filter_sql else 'WHERE'} status = 'Resolved';", params)
    resolved_reports = cursor.fetchone()[0]

    cursor.execute(f"SELECT COUNT(*) FROM reports {filter_sql} {'AND' if filter_sql else 'WHERE'} status != 'Resolved';", params)
    unresolved_reports = cursor.fetchone()[0]

    cursor.execute(f"SELECT COUNT(*) FROM reports {filter_sql} {'AND' if filter_sql else 'WHERE'} status IN ('Submitted', 'Validated', 'Classified');", params)
    pending_reports = cursor.fetchone()[0]

    cursor.execute(f"SELECT COUNT(*) FROM reports {filter_sql} {'AND' if filter_sql else 'WHERE'} status = 'Escalated';", params)
    escalated_reports = cursor.fetchone()[0]

    cursor.execute(f"SELECT COUNT(*) FROM reports {filter_sql} {'AND' if filter_sql else 'WHERE'} priority = 'Critical' AND status != 'Resolved';", params)
    critical_active = cursor.fetchone()[0]

    # 2. Category Distribution
    cursor.execute(f"""
        SELECT category, COUNT(*) as count
        FROM reports
        {filter_sql}
        GROUP BY category
        ORDER BY count DESC;
    """, params)
    category_distribution = [{"name": row["category"], "value": row["count"]} for row in cursor.fetchall()]

    # 3. Zone Distribution
    cursor.execute(f"""
        SELECT zone, COUNT(*) as count
        FROM reports
        {filter_sql}
        GROUP BY zone
        ORDER BY count DESC;
    """, params)
    zone_distribution = [{"zone": row["zone"].split(" - ")[0], "fullName": row["zone"], "count": row["count"]} for row in cursor.fetchall()]

    # 4. Priority Distribution
    cursor.execute(f"""
        SELECT priority, COUNT(*) as count
        FROM reports
        {filter_sql}
        GROUP BY priority
        ORDER BY 
            CASE priority
                WHEN 'Critical' THEN 1
                WHEN 'High' THEN 2
                WHEN 'Medium' THEN 3
                WHEN 'Low' THEN 4
            END;
    """, params)
    priority_distribution = [{"priority": row["priority"], "count": row["count"]} for row in cursor.fetchall()]

    # 5. Status Breakdown
    cursor.execute(f"""
        SELECT status, COUNT(*) as count
        FROM reports
        {filter_sql}
        GROUP BY status;
    """, params)
    status_distribution = [{"status": row["status"], "count": row["count"]} for row in cursor.fetchall()]

    # 6. Handler Workload Comparison
    cursor.execute("""
        SELECT h.id, h.name, h.assigned_zone, h.availability, h.capacity, h.current_load
        FROM handlers h
        ORDER BY h.current_load DESC, h.name ASC;
    """)
    handlers = cursor.fetchall()
    handler_workload = []
    for h in handlers:
        cap = h["capacity"]
        load = h["current_load"]
        util = round((load / cap) * 100, 1) if cap > 0 else 0
        handler_workload.append({
            "id": h["id"],
            "name": h["name"].replace("Officer ", ""),
            "fullName": h["name"],
            "zone": h["assigned_zone"].split(" - ")[0],
            "availability": bool(h["availability"]),
            "capacity": cap,
            "load": load,
            "utilization": util,
            "is_full": load >= cap
        })

    # 7. Donut Chart Data (Resolved vs Unresolved)
    resolution_data = [
        {"name": "Resolved", "value": resolved_reports, "color": "#10b981"},
        {"name": "Active / Unresolved", "value": unresolved_reports, "color": "#f59e0b"}
    ]

    return {
        "summary": {
            "total_reports": total_reports,
            "resolved_reports": resolved_reports,
            "unresolved_reports": unresolved_reports,
            "pending_reports": pending_reports,
            "escalated_reports": escalated_reports,
            "critical_active": critical_active,
            "resolution_rate": round((resolved_reports / total_reports * 100), 1) if total_reports > 0 else 0
        },
        "category_distribution": category_distribution,
        "zone_distribution": zone_distribution,
        "priority_distribution": priority_distribution,
        "status_distribution": status_distribution,
        "resolution_data": resolution_data,
        "handler_workload": handler_workload
    }

