"""
PARKGUARD Comprehensive Test Suite
Validates DFA vs Regex formal behavior, 5-category classification,
deterministic priority resolution, routing algorithms, capacity overflow,
queue ordering, status updates, and database persistence.
"""

import os
import sys
import pytest
import sqlite3
import json

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from validation import (
    validate_field, vehicle_dfa, violation_code_dfa,
    phone_dfa, email_dfa, VEHICLE_REGEX, VIOLATION_CODE_REGEX,
    PHONE_REGEX, EMAIL_REGEX, validate_report_submission
)
from classification import classify_violation, generate_unique_report_id
from database import init_db, get_db_connection, recalculate_handler_loads
from routing import execute_routing_algorithm, reprocess_priority_queue


@pytest.fixture
def test_db():
    """Provides a fresh isolated in-memory or temporary SQLite database."""
    db_path = os.path.join(backend_dir, "test_parkguard.db")
    if os.path.exists(db_path):
        os.remove(db_path)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")

    # Setup schema
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE handlers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            categories TEXT NOT NULL,
            assigned_zone TEXT NOT NULL,
            availability INTEGER NOT NULL DEFAULT 1,
            capacity INTEGER NOT NULL DEFAULT 5,
            current_load INTEGER NOT NULL DEFAULT 0
        );
    """)
    cursor.execute("""
        CREATE TABLE reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id TEXT UNIQUE NOT NULL,
            reporter_name TEXT NOT NULL,
            reporter_email TEXT NOT NULL,
            phone TEXT NOT NULL,
            vehicle_number TEXT NOT NULL,
            vehicle_type TEXT NOT NULL,
            violation_code TEXT NOT NULL,
            category TEXT NOT NULL,
            zone TEXT NOT NULL,
            description TEXT NOT NULL,
            priority TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Submitted',
            assigned_handler_id INTEGER NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (assigned_handler_id) REFERENCES handlers(id)
        );
    """)
    cursor.execute("""
        CREATE TABLE routing_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            zone TEXT NOT NULL,
            primary_handler_id INTEGER NOT NULL,
            backup_handler_id INTEGER NOT NULL,
            FOREIGN KEY (primary_handler_id) REFERENCES handlers(id),
            FOREIGN KEY (backup_handler_id) REFERENCES handlers(id)
        );
    """)
    cursor.execute("""
        CREATE TABLE status_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id TEXT NOT NULL,
            old_status TEXT NOT NULL,
            new_status TEXT NOT NULL,
            updated_by TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    cursor.execute("""
        CREATE TABLE routing_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id TEXT NOT NULL,
            handler_id INTEGER NULL,
            routing_reason TEXT NOT NULL,
            escalation_reason TEXT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Seed 2 handlers: primary and backup
    cursor.execute("""
        INSERT INTO handlers (name, categories, assigned_zone, availability, capacity, current_load)
        VALUES ('Primary Officer Alpha', '["Traffic Obstruction"]', 'Zone A', 1, 2, 0);
    """)
    cursor.execute("""
        INSERT INTO handlers (name, categories, assigned_zone, availability, capacity, current_load)
        VALUES ('Backup Officer Bravo', '["Traffic Obstruction"]', 'Zone A', 1, 2, 0);
    """)
    conn.commit()

    # Seed routing rule
    cursor.execute("""
        INSERT INTO routing_rules (category, zone, primary_handler_id, backup_handler_id)
        VALUES ('Traffic Obstruction', 'Zone A', 1, 2);
    """)
    conn.commit()

    yield conn, db_path

    conn.close()
    if os.path.exists(db_path):
        os.remove(db_path)


# ==============================================================================
# TEST CASE 1: Valid Vehicle Registration (DFA & Regex)
# ==============================================================================
def test_valid_vehicle_registration():
    valid_plates = ["DL-01-AB-1234", "CA 12 XY 9876", "NY04A1234", "MH-12-DE-1433"]
    for plate in valid_plates:
        res = validate_field("vehicle_number", plate)
        assert res["is_valid"] is True, f"Plate {plate} should be valid"
        assert res["dfa_valid"] is True
        assert res["regex_valid"] is True
        assert res["dfa"]["final_state"] == "Q_ACCEPT"


# ==============================================================================
# TEST CASE 2: Invalid Vehicle Registration
# ==============================================================================
def test_invalid_vehicle_registration():
    invalid_plates = ["INVALID-99", "12-AB-34", "A1-23-45", "DL-01-AB-12345", "D-01-A-1234", ""]
    for plate in invalid_plates:
        res = validate_field("vehicle_number", plate)
        assert res["is_valid"] is False, f"Plate '{plate}' should be invalid"
        assert res["dfa_valid"] is False


# ==============================================================================
# TEST CASE 3: Valid Phone Number
# ==============================================================================
def test_valid_phone_number():
    valid_phones = ["9876543210", "+12345678901", "123456789012"]
    for p in valid_phones:
        res = validate_field("phone", p)
        assert res["is_valid"] is True, f"Phone '{p}' should be valid"
        assert res["dfa_valid"] is True


# ==============================================================================
# TEST CASE 4: Invalid Phone Number
# ==============================================================================
def test_invalid_phone_number():
    invalid_phones = ["12345", "987654321012345", "abc1234567", "++9876543210"]
    for p in invalid_phones:
        res = validate_field("phone", p)
        assert res["is_valid"] is False, f"Phone '{p}' should be invalid"


# ==============================================================================
# TEST CASE 5: Regex and DFA Agreement
# ==============================================================================
def test_regex_and_dfa_agreement():
    test_inputs = [
        ("vehicle_number", "DL-01-AB-1234"),
        ("vehicle_number", "INVALID-PLATE"),
        ("violation_code", "NPZ-101"),
        ("violation_code", "XYZ-999"),
        ("phone", "9876543210"),
        ("phone", "invalid-phone"),
        ("reporter_email", "admin@parkguard.gov"),
        ("reporter_email", "not-an-email")
    ]
    for field, val in test_inputs:
        res = validate_field(field, val)
        assert res["agreement"] is True, f"Field {field} value {val} failed agreement"
        assert res["dfa_valid"] == res["regex_valid"]


# ==============================================================================
# TEST CASE 6: Correct Classification for All Five Categories
# ==============================================================================
def test_correct_classification_all_five_categories():
    scenarios = [
        ("NPZ-101", "Vehicle left in posted red curb tow away lane", "No-Parking Zone Violation"),
        ("IMP-201", "Car parked diagonally across lines straddling two spots", "Improper Parking"),
        ("PSM-301", "Vehicle without handicap permit occupying disabled bay", "Parking Space Misuse"),
        ("OST-401", "Meter expired 3 hours ago beyond posted limit", "Overstay Violation"),
        ("TOB-501", "Car obstructing fire hydrant and blocking active street lane", "Traffic Obstruction")
    ]
    for code, desc, expected_cat in scenarios:
        res = classify_violation(violation_code=code, description=desc)
        assert res["category"] == expected_cat, f"Expected {expected_cat}, got {res['category']}"


# ==============================================================================
# TEST CASE 7: Conflicting Classification Patterns (Deterministic Precedence)
# ==============================================================================
def test_conflicting_classification_patterns():
    # Description contains overstay AND fire hydrant block
    res = classify_violation(
        violation_code="OST-401",
        description="Car overstayed meter by 2 hours and is blocking fire hydrant and ambulance entrance"
    )
    # Life safety emergency override should win!
    assert res["category"] == "Traffic Obstruction"
    assert res["priority"] == "Critical"
    assert "CRITICAL OVERRIDE" in res["classification_reason"]


# ==============================================================================
# TEST CASE 8: Invalid Violation Code
# ==============================================================================
def test_invalid_violation_code():
    res = validate_field("violation_code", "XYZ-999")
    assert res["is_valid"] is False
    assert res["dfa_valid"] is False

    res_short = validate_field("violation_code", "NPZ-1")
    assert res_short["is_valid"] is False


# ==============================================================================
# TEST CASE 9: Unknown Routing Zone
# ==============================================================================
def test_unknown_routing_zone(test_db):
    conn, _ = test_db
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO reports (
            report_id, reporter_name, reporter_email, phone, vehicle_number,
            vehicle_type, violation_code, category, zone, description, priority, status
        ) VALUES ('PKG-2026-TEST01', 'Test User', 'u@test.com', '9876543210', 'DL-01-AB-1234',
                  'Sedan', 'OST-401', 'Overstay Violation', 'Zone Unknown X', 'Overstay test', 'Low', 'Validated');
    """)
    conn.commit()

    routing_res = execute_routing_algorithm(
        report_id="PKG-2026-TEST01",
        category="Overstay Violation",
        zone="Zone Unknown X",
        priority="Low",
        conn=conn
    )
    # Should safely fallback or queue
    assert routing_res["status"] in ("Assigned", "Submitted", "Escalated")


# ==============================================================================
# TEST CASE 10: Available Handler Assignment
# ==============================================================================
def test_available_handler_assignment(test_db):
    conn, _ = test_db
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO reports (
            report_id, reporter_name, reporter_email, phone, vehicle_number,
            vehicle_type, violation_code, category, zone, description, priority, status
        ) VALUES ('PKG-2026-TEST10', 'John Doe', 'j@test.com', '9876543210', 'DL-01-AB-1234',
                  'Sedan', 'TOB-501', 'Traffic Obstruction', 'Zone A', 'Blocked lane', 'Critical', 'Validated');
    """)
    conn.commit()

    res = execute_routing_algorithm(
        report_id="PKG-2026-TEST10",
        category="Traffic Obstruction",
        zone="Zone A",
        priority="Critical",
        conn=conn
    )
    assert res["status"] == "Assigned"
    assert res["assigned_handler_id"] == 1  # Primary Officer Alpha
    assert "Primary Officer Alpha" in res["assigned_handler_name"]


# ==============================================================================
# TEST CASE 11: Unavailable Handler Handling
# ==============================================================================
def test_unavailable_handler(test_db):
    conn, _ = test_db
    cursor = conn.cursor()
    # Mark Primary handler as unavailable (off-duty)
    cursor.execute("UPDATE handlers SET availability = 0 WHERE id = 1;")
    conn.commit()

    cursor.execute("""
        INSERT INTO reports (
            report_id, reporter_name, reporter_email, phone, vehicle_number,
            vehicle_type, violation_code, category, zone, description, priority, status
        ) VALUES ('PKG-2026-TEST11', 'Jane Doe', 'jane@test.com', '9876543210', 'DL-01-AB-1234',
                  'Sedan', 'TOB-501', 'Traffic Obstruction', 'Zone A', 'Blocked lane', 'High', 'Validated');
    """)
    conn.commit()

    res = execute_routing_algorithm(
        report_id="PKG-2026-TEST11",
        category="Traffic Obstruction",
        zone="Zone A",
        priority="High",
        conn=conn
    )
    # Routed to Backup Officer Bravo (ID 2)
    assert res["status"] == "Assigned"
    assert res["assigned_handler_id"] == 2
    assert res["is_backup"] is True


# ==============================================================================
# TEST CASE 12: Handler Capacity Overflow
# ==============================================================================
def test_handler_capacity_overflow(test_db):
    conn, _ = test_db
    cursor = conn.cursor()
    # Set both primary and backup loads to equal capacity
    cursor.execute("UPDATE handlers SET current_load = capacity;")
    conn.commit()

    cursor.execute("""
        INSERT INTO reports (
            report_id, reporter_name, reporter_email, phone, vehicle_number,
            vehicle_type, violation_code, category, zone, description, priority, status
        ) VALUES ('PKG-2026-TEST12', 'Overflow User', 'o@test.com', '9876543210', 'DL-01-AB-1234',
                  'Sedan', 'TOB-501', 'Traffic Obstruction', 'Zone A', 'Blocked lane', 'Low', 'Validated');
    """)
    conn.commit()

    res = execute_routing_algorithm(
        report_id="PKG-2026-TEST12",
        category="Traffic Obstruction",
        zone="Zone A",
        priority="Low",
        conn=conn
    )
    # Should not assign to overloaded handlers; should be queued
    assert res["assigned_handler_id"] is None
    assert res["status"] in ("Submitted", "Escalated")


# ==============================================================================
# TEST CASE 13: Backup Handler Assignment
# ==============================================================================
def test_backup_handler_assignment(test_db):
    conn, _ = test_db
    cursor = conn.cursor()
    # Primary full, backup has room
    cursor.execute("UPDATE handlers SET current_load = 2 WHERE id = 1;")  # Primary full (cap 2)
    cursor.execute("UPDATE handlers SET current_load = 0 WHERE id = 2;")  # Backup free (cap 2)
    conn.commit()

    cursor.execute("""
        INSERT INTO reports (
            report_id, reporter_name, reporter_email, phone, vehicle_number,
            vehicle_type, violation_code, category, zone, description, priority, status
        ) VALUES ('PKG-2026-TEST13', 'User Backup', 'b@test.com', '9876543210', 'DL-01-AB-1234',
                  'Sedan', 'TOB-501', 'Traffic Obstruction', 'Zone A', 'Blocked lane', 'High', 'Validated');
    """)
    conn.commit()

    res = execute_routing_algorithm(
        report_id="PKG-2026-TEST13",
        category="Traffic Obstruction",
        zone="Zone A",
        priority="High",
        conn=conn
    )
    assert res["assigned_handler_id"] == 2
    assert res["is_backup"] is True


# ==============================================================================
# TEST CASE 14: Critical Priority Override
# ==============================================================================
def test_critical_priority_override(test_db):
    conn, _ = test_db
    cursor = conn.cursor()
    # When all handlers saturated, Critical priority triggers immediate Escalated status
    cursor.execute("UPDATE handlers SET current_load = capacity;")
    conn.commit()

    cursor.execute("""
        INSERT INTO reports (
            report_id, reporter_name, reporter_email, phone, vehicle_number,
            vehicle_type, violation_code, category, zone, description, priority, status
        ) VALUES ('PKG-2026-TEST14', 'Crit User', 'crit@test.com', '9876543210', 'DL-01-AB-1234',
                  'Sedan', 'TOB-501', 'Traffic Obstruction', 'Zone A', 'Emergency fire hydrant blocked', 'Critical', 'Validated');
    """)
    conn.commit()

    res = execute_routing_algorithm(
        report_id="PKG-2026-TEST14",
        category="Traffic Obstruction",
        zone="Zone A",
        priority="Critical",
        conn=conn
    )
    assert res["status"] == "Escalated"
    assert "Priority Escalation" in res["routing_reason"]


# ==============================================================================
# TEST CASE 15: Queue Ordering (Priority Precedence + FIFO)
# ==============================================================================
def test_queue_ordering(test_db):
    conn, _ = test_db
    cursor = conn.cursor()
    # Fill handlers
    cursor.execute("UPDATE handlers SET current_load = capacity;")
    conn.commit()

    # Insert 3 queued reports: 1 Low, 1 Critical, 1 High
    cursor.execute("""
        INSERT INTO reports (report_id, reporter_name, reporter_email, phone, vehicle_number, vehicle_type, violation_code, category, zone, description, priority, status, created_at)
        VALUES ('Q-LOW', 'User 1', 'u1@test.com', '9876543210', 'DL-01-AB-1234', 'Sedan', 'OST-401', 'Overstay Violation', 'Zone A', 'Meter expired', 'Low', 'Submitted', '2026-11-13 10:00:00');
    """)
    cursor.execute("""
        INSERT INTO reports (report_id, reporter_name, reporter_email, phone, vehicle_number, vehicle_type, violation_code, category, zone, description, priority, status, created_at)
        VALUES ('Q-CRIT', 'User 2', 'u2@test.com', '9876543210', 'DL-01-AB-1234', 'Sedan', 'TOB-501', 'Traffic Obstruction', 'Zone A', 'Ambulance blocked', 'Critical', 'Escalated', '2026-11-13 10:05:00');
    """)
    cursor.execute("""
        INSERT INTO reports (report_id, reporter_name, reporter_email, phone, vehicle_number, vehicle_type, violation_code, category, zone, description, priority, status, created_at)
        VALUES ('Q-HIGH', 'User 3', 'u3@test.com', '9876543210', 'DL-01-AB-1234', 'Sedan', 'PSM-301', 'Traffic Obstruction', 'Zone A', 'Disabled bay blocked', 'High', 'Submitted', '2026-11-13 10:02:00');
    """)
    conn.commit()

    # Free up 1 capacity slot in Primary Officer
    cursor.execute("UPDATE handlers SET current_load = 1 WHERE id = 1;")
    conn.commit()

    # Reprocess priority queue
    reprocessed = reprocess_priority_queue(conn)

    # First reprocessed item MUST be the Critical one ('Q-CRIT'), even though 'Q-LOW' and 'Q-HIGH' were submitted earlier!
    assert len(reprocessed) >= 1
    assert reprocessed[0]["report_id"] == "Q-CRIT"


# ==============================================================================
# TEST CASE 16: Report Status Update & Handler Load Recalculation
# ==============================================================================
def test_report_status_update_and_load_recalculation(test_db):
    conn, _ = test_db
    cursor = conn.cursor()

    # Insert an assigned report
    cursor.execute("""
        INSERT INTO reports (report_id, reporter_name, reporter_email, phone, vehicle_number, vehicle_type, violation_code, category, zone, description, priority, status, assigned_handler_id)
        VALUES ('PKG-STATUS-01', 'User Stat', 's@test.com', '9876543210', 'DL-01-AB-1234', 'Sedan', 'TOB-501', 'Traffic Obstruction', 'Zone A', 'Desc', 'Medium', 'Assigned', 1);
    """)
    conn.commit()
    recalculate_handler_loads(conn)

    cursor.execute("SELECT current_load FROM handlers WHERE id = 1;")
    load_assigned = cursor.fetchone()[0]
    assert load_assigned == 1

    # Update to In Progress
    cursor.execute("UPDATE reports SET status = 'In Progress' WHERE report_id = 'PKG-STATUS-01';")
    conn.commit()
    recalculate_handler_loads(conn)
    cursor.execute("SELECT current_load FROM handlers WHERE id = 1;")
    assert cursor.fetchone()[0] == 1  # Still active

    # Update to Resolved
    cursor.execute("UPDATE reports SET status = 'Resolved' WHERE report_id = 'PKG-STATUS-01';")
    conn.commit()
    recalculate_handler_loads(conn)
    cursor.execute("SELECT current_load FROM handlers WHERE id = 1;")
    assert cursor.fetchone()[0] == 0  # Freed up!


# ==============================================================================
# TEST CASE 17: Database Persistence After Application Restart
# ==============================================================================
def test_database_persistence_restart(test_db):
    conn, db_path = test_db
    cursor = conn.cursor()
    test_report_id = "PKG-PERSIST-999"

    cursor.execute("""
        INSERT INTO reports (report_id, reporter_name, reporter_email, phone, vehicle_number, vehicle_type, violation_code, category, zone, description, priority, status)
        VALUES (?, 'Persistent Reporter', 'p@test.com', '9876543210', 'DL-01-AB-1234', 'Sedan', 'TOB-501', 'Traffic Obstruction', 'Zone A', 'Persistence verification', 'Critical', 'Assigned');
    """, (test_report_id,))
    conn.commit()

    # Simulate app shutdown and disconnect
    conn.close()

    # Simulate app restart: re-open database connection
    conn2 = sqlite3.connect(db_path)
    conn2.row_factory = sqlite3.Row
    cursor2 = conn2.cursor()
    cursor2.execute("SELECT * FROM reports WHERE report_id = ?;", (test_report_id,))
    row = cursor2.fetchone()

    assert row is not None, "Report should persist across connection restarts"
    assert row["report_id"] == test_report_id
    assert row["priority"] == "Critical"
    conn2.close()

