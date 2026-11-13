"""
PARKGUARD - Standalone Database Initializer
Usage:
    python init_db.py [--force]
"""

import sys
import os

# Add current dir to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import init_db

if __name__ == "__main__":
    force_reset = "--force" in sys.argv
    print(f"[*] Initializing PARKGUARD SQLite Database (force_reset={force_reset})...")
    init_db(force=force_reset)
    print("[+] Database successfully initialized with tables, indices, and realistic seed data!")
