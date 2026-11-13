"""
PARKGUARD - Intelligent Parking Violation Management System
Core Domain Models and Constants
"""

from typing import Dict, List, Optional
from datetime import datetime

# Exactly FIVE Violation Categories
VIOLATION_CATEGORIES = {
    "NPZ": {
        "id": "NPZ",
        "name": "No-Parking Zone Violation",
        "description": "Unauthorized parking in designated no-parking areas, red zones, or tow-away corridors.",
        "default_priority": "Medium",
        "code_prefix": "NPZ"
    },
    "IMP": {
        "id": "IMP",
        "name": "Improper Parking",
        "description": "Vehicles parked across lane markers, double-parked, curb-mounting, or angled illegally.",
        "default_priority": "Medium",
        "code_prefix": "IMP"
    },
    "PSM": {
        "id": "PSM",
        "name": "Parking Space Misuse",
        "description": "Unauthorized use of handicapped/disabled stalls, EV charging bays, or reserved municipal spaces.",
        "default_priority": "High",
        "code_prefix": "PSM"
    },
    "OST": {
        "id": "OST",
        "name": "Overstay Violation",
        "description": "Exceeding posted time limits, unpaid parking meter overstay, or overnight unauthorized parking.",
        "default_priority": "Low",
        "code_prefix": "OST"
    },
    "TOB": {
        "id": "TOB",
        "name": "Traffic Obstruction",
        "description": "Blocking active traffic lanes, fire hydrants, emergency vehicle exits, driveways, or pedestrian crosswalks.",
        "default_priority": "Critical",
        "code_prefix": "TOB"
    }
}

# Standard Violation Codes
VIOLATION_CODES = {
    "NPZ-101": {"category": "No-Parking Zone Violation", "title": "Red Zone / Tow-Away Parking", "priority": "High"},
    "NPZ-102": {"category": "No-Parking Zone Violation", "title": "Posted No-Parking Street", "priority": "Medium"},
    "IMP-201": {"category": "Improper Parking", "title": "Double Parking / Straddling Stalls", "priority": "High"},
    "IMP-202": {"category": "Improper Parking", "title": "Curb Misalignment / Sidewalk Encroachment", "priority": "Medium"},
    "PSM-301": {"category": "Parking Space Misuse", "title": "Unauthorized Disabled / Handicap Bay", "priority": "High"},
    "PSM-302": {"category": "Parking Space Misuse", "title": "ICE Vehicle in EV Charging Spot", "priority": "Medium"},
    "OST-401": {"category": "Overstay Violation", "title": "Meter Expired Exceeding 2 Hours", "priority": "Low"},
    "OST-402": {"category": "Overstay Violation", "title": "Commercial Loading Bay Overstay", "priority": "Medium"},
    "TOB-501": {"category": "Traffic Obstruction", "title": "Blocking Fire Hydrant / Emergency Route", "priority": "Critical"},
    "TOB-502": {"category": "Traffic Obstruction", "title": "Active Lane / Intersection Blockage", "priority": "Critical"}
}

# Priority Levels with numeric weights for deterministic ordering
PRIORITY_LEVELS = {
    "Critical": 4,
    "High": 3,
    "Medium": 2,
    "Low": 1
}

# Available Zones
AVAILABLE_ZONES = [
    "Zone A - Downtown Commercial",
    "Zone B - Residential North",
    "Zone C - Hospital & Transit Hub",
    "Zone D - Industrial & Port",
    "Zone E - Waterfront & Entertainment"
]

# Vehicle Types
VEHICLE_TYPES = [
    "Sedan",
    "SUV / Crossover",
    "Truck / Heavy Commercial",
    "Motorcycle / Scooter",
    "Van / Minibus",
    "Electric Vehicle (EV)"
]

# Report Lifecycle Statuses
STATUS_LIFECYCLE = [
    "Submitted",
    "Validated",
    "Classified",
    "Assigned",
    "In Progress",
    "Resolved",
    "Escalated"
]

