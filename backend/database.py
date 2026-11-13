"""
PARKGUARD - Database Integration Layer (SQLite)
Manages schema migration, relational integrity, initial seeding, and thread-safe connections.
"""

import sqlite3
import os
import json
from datetime import datetime, timedelta
from typing import Optional

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "parkguard.db")

def get_db_connection():
    """
    Returns an active SQLite connection configured with Row factory
    and enforced Foreign Key constraints.
    """
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db(force: bool = False):
    """
    Initializes database schema and populates seed data if empty or forced.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    if force:
        cursor.execute("DROP TABLE IF EXISTS routing_logs;")
        cursor.execute("DROP TABLE IF EXISTS status_history;")
        cursor.execute("DROP TABLE IF EXISTS routing_rules;")
        cursor.execute("DROP TABLE IF EXISTS reports;")
        cursor.execute("DROP TABLE IF EXISTS handlers;")

    # 1. handlers Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS handlers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            categories TEXT NOT NULL,
            assigned_zone TEXT NOT NULL,
            availability INTEGER NOT NULL DEFAULT 1,
            capacity INTEGER NOT NULL DEFAULT 5,
            current_load INTEGER NOT NULL DEFAULT 0
        );
    """)

    # 2. reports Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reports (
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
            FOREIGN KEY (assigned_handler_id) REFERENCES handlers(id) ON DELETE SET NULL
        );
    """)

    # 3. routing_rules Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS routing_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            zone TEXT NOT NULL,
            primary_handler_id INTEGER NOT NULL,
            backup_handler_id INTEGER NOT NULL,
            FOREIGN KEY (primary_handler_id) REFERENCES handlers(id) ON DELETE CASCADE,
            FOREIGN KEY (backup_handler_id) REFERENCES handlers(id) ON DELETE CASCADE
        );
    """)

    # 4. status_history Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS status_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id TEXT NOT NULL,
            old_status TEXT NOT NULL,
            new_status TEXT NOT NULL,
            updated_by TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # 5. routing_logs Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS routing_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id TEXT NOT NULL,
            handler_id INTEGER NULL,
            routing_reason TEXT NOT NULL,
            escalation_reason TEXT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (handler_id) REFERENCES handlers(id) ON DELETE SET NULL
        );
    """)

    # Indices for high-performance lookups
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_report_id ON reports(report_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_zone ON reports(zone);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_reports_handler ON reports(assigned_handler_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_routing_rules_cat_zone ON routing_rules(category, zone);")

    conn.commit()

    # Seed initial data if tables are empty
    cursor.execute("SELECT COUNT(*) FROM handlers;")
    if cursor.fetchone()[0] == 0:
        seed_initial_data(conn)

    conn.close()


def seed_initial_data(conn):
    """
    Inserts realistic administrative handlers, routing rules, and sample historical reports.
    """
    cursor = conn.cursor()

    # Seed 6 Professional Handlers
    sample_handlers = [
        ("Officer Sarah Jenkins", json.dumps(["Traffic Obstruction", "No-Parking Zone Violation"]), "Zone A - Downtown Commercial", 1, 5, 2),
        ("Officer Marcus Vance", json.dumps(["Parking Space Misuse", "Improper Parking"]), "Zone A - Downtown Commercial", 1, 4, 1),
        ("Officer Elena Rostova", json.dumps(["Traffic Obstruction", "Overstay Violation"]), "Zone B - Residential North", 1, 4, 1),
        ("Officer David Kim", json.dumps(["No-Parking Zone Violation", "Parking Space Misuse"]), "Zone C - Hospital & Transit Hub", 1, 6, 2),
        ("Officer Aisha Patel", json.dumps(["Traffic Obstruction", "Improper Parking"]), "Zone C - Hospital & Transit Hub", 1, 5, 2),
        ("Officer Carlos Mendez", json.dumps(["Overstay Violation", "No-Parking Zone Violation"]), "Zone D - Industrial & Port", 1, 4, 1),
    ]

    cursor.executemany("""
        INSERT INTO handlers (name, categories, assigned_zone, availability, capacity, current_load)
        VALUES (?, ?, ?, ?, ?, ?);
    """, sample_handlers)

    # Fetch handler IDs
    cursor.execute("SELECT id, name FROM handlers;")
    handlers_map = {row["name"]: row["id"] for row in cursor.fetchall()}

    h_jenkins = handlers_map["Officer Sarah Jenkins"]
    h_vance = handlers_map["Officer Marcus Vance"]
    h_rostova = handlers_map["Officer Elena Rostova"]
    h_kim = handlers_map["Officer David Kim"]
    h_patel = handlers_map["Officer Aisha Patel"]
    h_mendez = handlers_map["Officer Carlos Mendez"]

    # Seed Comprehensive Routing Rules
    routing_rules_data = [
        # Zone A - Downtown Commercial
        ("Traffic Obstruction", "Zone A - Downtown Commercial", h_jenkins, h_patel),
        ("No-Parking Zone Violation", "Zone A - Downtown Commercial", h_jenkins, h_vance),
        ("Improper Parking", "Zone A - Downtown Commercial", h_vance, h_jenkins),
        ("Parking Space Misuse", "Zone A - Downtown Commercial", h_vance, h_kim),
        ("Overstay Violation", "Zone A - Downtown Commercial", h_jenkins, h_mendez),

        # Zone B - Residential North
        ("Traffic Obstruction", "Zone B - Residential North", h_rostova, h_jenkins),
        ("No-Parking Zone Violation", "Zone B - Residential North", h_rostova, h_jenkins),
        ("Improper Parking", "Zone B - Residential North", h_rostova, h_vance),
        ("Parking Space Misuse", "Zone B - Residential North", h_rostova, h_kim),
        ("Overstay Violation", "Zone B - Residential North", h_rostova, h_mendez),

        # Zone C - Hospital & Transit Hub
        ("Traffic Obstruction", "Zone C - Hospital & Transit Hub", h_patel, h_jenkins),
        ("No-Parking Zone Violation", "Zone C - Hospital & Transit Hub", h_kim, h_patel),
        ("Improper Parking", "Zone C - Hospital & Transit Hub", h_patel, h_vance),
        ("Parking Space Misuse", "Zone C - Hospital & Transit Hub", h_kim, h_patel),
        ("Overstay Violation", "Zone C - Hospital & Transit Hub", h_kim, h_mendez),

        # Zone D - Industrial & Port
        ("Traffic Obstruction", "Zone D - Industrial & Port", h_mendez, h_jenkins),
        ("No-Parking Zone Violation", "Zone D - Industrial & Port", h_mendez, h_jenkins),
        ("Improper Parking", "Zone D - Industrial & Port", h_mendez, h_vance),
        ("Parking Space Misuse", "Zone D - Industrial & Port", h_mendez, h_kim),
        ("Overstay Violation", "Zone D - Industrial & Port", h_mendez, h_rostova),

        # Zone E - Waterfront & Entertainment
        ("Traffic Obstruction", "Zone E - Waterfront & Entertainment", h_jenkins, h_patel),
        ("No-Parking Zone Violation", "Zone E - Waterfront & Entertainment", h_vance, h_jenkins),
        ("Improper Parking", "Zone E - Waterfront & Entertainment", h_vance, h_patel),
        ("Parking Space Misuse", "Zone E - Waterfront & Entertainment", h_kim, h_vance),
        ("Overstay Violation", "Zone E - Waterfront & Entertainment", h_rostova, h_mendez),
    ]

    cursor.executemany("""
        INSERT INTO routing_rules (category, zone, primary_handler_id, backup_handler_id)
        VALUES (?, ?, ?, ?);
    """, routing_rules_data)

    # Seed Sample Initial Reports across various statuses and priorities
    now = datetime.now()
    sample_reports = [
        (
            "PKG-2026-0001", "Jonathan Miller", "j.miller@transit.org", "9812345670",
            "DL-04-AX-5521", "Sedan", "TOB-501", "Traffic Obstruction",
            "Zone C - Hospital & Transit Hub", "Vehicle completely blocking ambulance bay entrance at Regional Trauma Center.",
            "Critical", "In Progress", h_patel,
            (now - timedelta(hours=3)).isoformat()
        ),
        (
            "PKG-2026-0002", "Maya Lin", "maya.lin@citycorp.com", "9876543210",
            "CA-12-XY-9876", "SUV / Crossover", "PSM-301", "Parking Space Misuse",
            "Zone A - Downtown Commercial", "Luxury SUV parked in designated handicapped spot without disability placard.",
            "High", "Resolved", h_vance,
            (now - timedelta(hours=6)).isoformat()
        ),
        (
            "PKG-2026-0003", "Robert Chen", "rchen@metropolis.gov", "9823456789",
            "NY-02-CD-4412", "Truck / Heavy Commercial", "NPZ-101", "No-Parking Zone Violation",
            "Zone A - Downtown Commercial", "Commercial delivery box truck idling in clearly marked red tow-away lane.",
            "High", "In Progress", h_jenkins,
            (now - timedelta(hours=2)).isoformat()
        ),
        (
            "PKG-2026-0004", "Fatima Al-Sayed", "fatima.as@gmail.com", "9834567890",
            "MH-12-DE-1433", "Sedan", "OST-401", "Overstay Violation",
            "Zone D - Industrial & Port", "Unattended sedan parked past the 2-hour posted municipal time limit.",
            "Low", "Resolved", h_mendez,
            (now - timedelta(days=1)).isoformat()
        ),
        (
            "PKG-2026-0005", "David Wright", "dwright@civicmail.net", "9845678901",
            "DL-01-AB-1234", "Van / Minibus", "IMP-201", "Improper Parking",
            "Zone A - Downtown Commercial", "Van straddling two parking bays and encroaching into pedestrian sidewalk.",
            "Medium", "Assigned", h_vance,
            (now - timedelta(minutes=45)).isoformat()
        ),
        (
            "PKG-2026-0006", "Clara Oswald", "coswald@metrotransit.org", "9856789012",
            "KA-03-MG-7890", "Sedan", "TOB-502", "Traffic Obstruction",
            "Zone B - Residential North", "Parked vehicle blocking residential crosswalk and private driveway.",
            "Critical", "In Progress", h_rostova,
            (now - timedelta(hours=1, minutes=15)).isoformat()
        ),
        (
            "PKG-2026-0007", "Samuel Green", "sgreen@greentech.io", "9867890123",
            "TS-07-EK-3344", "Electric Vehicle (EV)", "PSM-302", "Parking Space Misuse",
            "Zone C - Hospital & Transit Hub", "Unplugged vehicle occupying dedicated rapid EV charging terminal.",
            "Medium", "Resolved", h_kim,
            (now - timedelta(days=1, hours=2)).isoformat()
        ),
        (
            "PKG-2026-0008", "Angela Davis", "angela.d@neighborhood.org", "9878901234",
            "HR-26-BR-9900", "SUV / Crossover", "NPZ-102", "No-Parking Zone Violation",
            "Zone C - Hospital & Transit Hub", "Vehicle parked directly under No-Parking Anytime municipal signage.",
            "Medium", "Assigned", h_kim,
            (now - timedelta(minutes=30)).isoformat()
        ),
        (
            "PKG-2026-0009", "Trevor Phillips", "tphillips@logistics.net", "9889012345",
            "UP-16-ZZ-1122", "Truck / Heavy Commercial", "TOB-501", "Traffic Obstruction",
            "Zone A - Downtown Commercial", "Heavy flatbed trailer left obstructing fire hydrant adjacent to high-rise building.",
            "Critical", "In Progress", h_jenkins,
            (now - timedelta(minutes=20)).isoformat()
        )
    ]

    for rep in sample_reports:
        cursor.execute("""
            INSERT INTO reports (
                report_id, reporter_name, reporter_email, phone, vehicle_number,
                vehicle_type, violation_code, category, zone, description,
                priority, status, assigned_handler_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            rep[0], rep[1], rep[2], rep[3], rep[4],
            rep[5], rep[6], rep[7], rep[8], rep[9],
            rep[10], rep[11], rep[12], rep[13], rep[13]
        ))

        # Status History
        cursor.execute("""
            INSERT INTO status_history (report_id, old_status, new_status, updated_by, timestamp)
            VALUES (?, 'Submitted', ?, 'Automated Routing Engine', ?);
        """, (rep[0], rep[11], rep[13]))

        # Routing Log
        cursor.execute("""
            INSERT INTO routing_logs (report_id, handler_id, routing_reason, escalation_reason, timestamp)
            VALUES (?, ?, 'Assigned to primary zone specialist with optimal capacity.', NULL, ?);
        """, (rep[0], rep[12], rep[13]))

    conn.commit()


def recalculate_handler_loads(conn):
    """
    Recalculates current active load for every handler based on
    reports in 'Assigned' or 'In Progress' status.
    """
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE handlers
        SET current_load = (
            SELECT COUNT(*) FROM reports
            WHERE reports.assigned_handler_id = handlers.id
            AND reports.status IN ('Assigned', 'In Progress')
        );
    """)
    conn.commit()
