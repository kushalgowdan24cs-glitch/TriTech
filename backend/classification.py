"""
PARKGUARD - Automatic Violation Classification and Priority Engine
Implements deterministic rule-based category detection, keyword matching,
precedence conflict resolution, and intelligent urgency calculation.
"""

import re
import random
from typing import Dict, Any, Tuple
from models import VIOLATION_CATEGORIES, VIOLATION_CODES, PRIORITY_LEVELS

# Explicit Keyword Dictionaries for each of the FIVE categories
CATEGORY_KEYWORDS = {
    "Traffic Obstruction": [
        "fire hydrant", "ambulance", "emergency", "blocked lane", "block traffic",
        "intersection", "crosswalk", "active traffic", "tram track", "driveway blocked",
        "gridlock", "hazard", "blocking street", "roadway blocked", "hospital entrance"
    ],
    "Parking Space Misuse": [
        "handicap", "disabled", "wheelchair", "blue badge", "accessible stall",
        "ev charging", "electric vehicle", "charger blocked", "reserved spot",
        "municipal permit", "diplomatic", "permit required", "loading bay misuse"
    ],
    "No-Parking Zone Violation": [
        "no parking", "red curb", "tow away", "tow zone", "bus stop",
        "taxi stand", "prohibited zone", "clearway", "no standing", "yellow line",
        "loading zone unauthorized", "strict no parking"
    ],
    "Improper Parking": [
        "double park", "double-parked", "straddling", "diagonal", "curb mounting",
        "sidewalk", "across lines", "two spots", "taking two spaces", "crooked",
        "blocking vehicle", "wrong direction", "tail sticking out"
    ],
    "Overstay Violation": [
        "overstay", "meter expired", "exceeded time", "posted limit", "time limit",
        "2 hours over", "abandoned", "parked overnight", "all day", "ticket expired",
        "unpaid meter", "exceeded 30 mins"
    ]
}

# Category Precedence Rank when multiple match
CATEGORY_PRECEDENCE = [
    "Traffic Obstruction",        # Rank 1: Life safety & emergency access
    "Parking Space Misuse",       # Rank 2: Accessibility & specialized infrastructure
    "No-Parking Zone Violation",  # Rank 3: Legal transit corridor protection
    "Improper Parking",           # Rank 4: Spatial alignment & space efficiency
    "Overstay Violation"          # Rank 5: Temporal tariff compliance
]

# Code Prefix to Category Map
PREFIX_TO_CATEGORY = {
    "NPZ": "No-Parking Zone Violation",
    "IMP": "Improper Parking",
    "PSM": "Parking Space Misuse",
    "OST": "Overstay Violation",
    "TOB": "Traffic Obstruction"
}


def classify_violation(
    violation_code: str,
    description: str,
    urgency_input: str = "Medium"
) -> Dict[str, Any]:
    """
    Deterministically classifies the violation into one of the 5 categories
    and computes the final priority level.
    """
    clean_desc = (description or "").lower()
    clean_code = (violation_code or "").upper().strip()

    # Step 1: Detect category from structured violation code
    code_category = None
    code_priority = None

    if clean_code in VIOLATION_CODES:
        code_category = VIOLATION_CODES[clean_code]["category"]
        code_priority = VIOLATION_CODES[clean_code]["priority"]
    else:
        # Check prefix
        for prefix, cat_name in PREFIX_TO_CATEGORY.items():
            if clean_code.startswith(prefix):
                code_category = cat_name
                break

    # Step 2: Keyword matching in description
    keyword_matches = {}
    for cat_name, kw_list in CATEGORY_KEYWORDS.items():
        matched_words = [kw for kw in kw_list if kw in clean_desc]
        if matched_words:
            keyword_matches[cat_name] = matched_words

    # Step 3: Conflict Resolution & Final Category Determination
    classification_reason = []
    final_category = None

    # Check for severe emergency keywords that override everything else (Traffic Obstruction)
    emergency_trigger = any(kw in clean_desc for kw in ["fire hydrant", "ambulance", "emergency", "hospital entrance"])
    if emergency_trigger:
        final_category = "Traffic Obstruction"
        classification_reason.append("CRITICAL OVERRIDE: Emergency / life safety keywords detected in incident description.")
    elif code_category:
        final_category = code_category
        classification_reason.append(f"Primary classification derived from structured violation code '{clean_code}'.")
        if final_category in keyword_matches:
            classification_reason.append(f"Confirmed by keyword match: {', '.join(keyword_matches[final_category][:3])}.")
        elif keyword_matches:
            secondary_cats = [c for c in keyword_matches.keys() if c != final_category]
            if secondary_cats:
                classification_reason.append(f"Secondary descriptive keywords for {secondary_cats} resolved in favor of formal code.")
    elif keyword_matches:
        # Resolve via deterministic precedence order
        for cat in CATEGORY_PRECEDENCE:
            if cat in keyword_matches:
                final_category = cat
                classification_reason.append(
                    f"Selected '{cat}' based on keyword matches ({', '.join(keyword_matches[cat][:2])}) via deterministic precedence hierarchy."
                )
                break
    else:
        # Default fallback
        final_category = "No-Parking Zone Violation"
        classification_reason.append("Default fallback assigned due to absence of specific keywords or recognized code.")

    # Step 4: Priority Engine
    # Priority Levels: Critical, High, Medium, Low
    final_priority = "Medium"
    priority_reason = []

    # Priority determination rules:
    if emergency_trigger or final_category == "Traffic Obstruction" or urgency_input == "Critical":
        final_priority = "Critical"
        priority_reason.append("Assigned CRITICAL priority: Active obstruction of traffic flow or emergency corridor.")
    elif (
        final_category == "Parking Space Misuse" and any(k in clean_desc for k in ["handicap", "disabled", "wheelchair"])
    ) or clean_code in ["PSM-301", "IMP-201", "TOB-501", "NPZ-101"] or urgency_input == "High":
        final_priority = "High"
        priority_reason.append("Assigned HIGH priority: Severe accessibility violation or high-impact congestion.")
    elif urgency_input in ["High", "Low", "Medium"]:
        final_priority = urgency_input
        priority_reason.append(f"Priority aligned with reporter urgency '{urgency_input}'.")
    elif code_priority:
        final_priority = code_priority
        priority_reason.append(f"Priority adopted from standard violation code catalog ({code_priority}).")
    else:
        final_priority = "Medium"
        priority_reason.append("Assigned standard MEDIUM priority baseline.")

    return {
        "category": final_category,
        "priority": final_priority,
        "classification_reason": " ".join(classification_reason),
        "priority_reason": " ".join(priority_reason),
        "keyword_matches": keyword_matches,
        "code_matched": code_category is not None
    }


def generate_unique_report_id(db_cursor=None) -> str:
    """
    Generates a professional unique Report ID: PKG-2026-XXXX
    """
    year = 2026
    if db_cursor:
        try:
            db_cursor.execute("SELECT COUNT(*) FROM reports")
            count = db_cursor.fetchone()[0] + 1
            return f"PKG-{year}-{count:04d}"
        except Exception:
            pass
    rand_suffix = random.randint(1000, 9999)
    return f"PKG-{year}-{rand_suffix}"
