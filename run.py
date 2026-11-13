"""
PARKGUARD - Unified Application Runner
Starts both the Flask REST API backend (port 5000)
and the Vite React dashboard frontend (port 5173).
"""

import subprocess
import sys
import os
import time

def run():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    frontend_dir = os.path.join(base_dir, "frontend")

    print("===================================================================")
    print("        PARKGUARD - Intelligent Parking Violation System           ")
    print("===================================================================")
    print(f"[*] Starting Flask REST API Backend on http://127.0.0.1:5000 ...")
    backend_proc = subprocess.Popen(
        [sys.executable, os.path.join(backend_dir, "app.py")],
        cwd=backend_dir
    )

    time.sleep(1.5)

    print(f"[*] Starting Vite React Dashboard Frontend on http://127.0.0.1:5173 ...")
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"],
        cwd=frontend_dir
    )

    print("\n[+] Both services are running:")
    print("    - Web Application: http://127.0.0.1:5173")
    print("    - REST API Gateway: http://127.0.0.1:5000/api/health")
    print("    - Press Ctrl+C to stop both servers.\n")

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\n[*] Stopping services...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("[+] PARKGUARD halted cleanly.")

if __name__ == "__main__":
    run()
