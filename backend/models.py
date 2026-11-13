"""
PARKGUARD - Intelligent Parking Violation Management System
Core Domain Models and Constants
"""

from typing import Dict, List, Optional
from datetime import datetime

# Exactly FIVE Violation Categories mapped directly to PV01 - PV05
VIOLATION_CATEGORIES = {
    "PV01": {
        "id": "PV01",
        "code": "PV01",
        "name": "No-Parking Zone Violation",
        "description": "Unauthorized parking in designated no-parking areas, red zones, or tow-away corridors.",
        "default_priority": "Medium",
        "code_prefix": "PV01"
    },
    "PV02": {
        "id": "PV02",
        "code": "PV02",
        "name": "Improper Parking",
        "description": "Vehicles parked across lane markers, double-parked, curb-mounting, or angled illegally.",
        "default_priority": "Medium",
        "code_prefix": "PV02"
    },
    "PV03": {
        "id": "PV03",
        "code": "PV03",
        "name": "Parking Space Misuse",
        "description": "Unauthorized use of handicapped/disabled stalls, EV charging bays, or reserved municipal spaces.",
        "default_priority": "High",
        "code_prefix": "PV03"
    },
    "PV04": {
        "id": "PV04",
        "code": "PV04",
        "name": "Overstay Violation",
        "description": "Exceeding posted time limits, unpaid parking meter overstay, or overnight unauthorized parking.",
        "default_priority": "Low",
        "code_prefix": "PV04"
    },
    "PV05": {
        "id": "PV05",
        "code": "PV05",
        "name": "Traffic Obstruction",
        "description": "Blocking active traffic lanes, fire hydrants, emergency vehicle exits, driveways, or pedestrian crosswalks.",
        "default_priority": "Critical",
        "code_prefix": "PV05"
    }
}

# Standard Violation Codes (PV01 to PV05)
VIOLATION_CODES = {
    "PV01": {
        "code": "PV01",
        "category": "No-Parking Zone Violation",
        "title": "Red Zone / Tow-Away / No-Parking Corridors",
        "priority": "Medium"
    },
    "PV02": {
        "code": "PV02",
        "category": "Improper Parking",
        "title": "Double Parking / Straddling Markings / Curb Encroachment",
        "priority": "Medium"
    },
    "PV03": {
        "code": "PV03",
        "category": "Parking Space Misuse",
        "title": "Disabled Handicap Bay / EV Charging Station Misuse",
        "priority": "High"
    },
    "PV04": {
        "code": "PV04",
        "category": "Overstay Violation",
        "title": "Meter Expired / Posted Time Limit Exceeded",
        "priority": "Low"
    },
    "PV05": {
        "code": "PV05",
        "category": "Traffic Obstruction",
        "title": "Fire Hydrant / Ambulance Route / Active Lane Blockage",
        "priority": "Critical"
    }
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
