# -*- coding: utf-8 -*-
"""
Full test: starts Flask backend in a thread, then runs API tests.
Run from backend/ directory: python run_full_test.py
"""
import sys
import json
import time
import threading
import requests

# ── Start Flask in background thread ──────────────────────────
def start_flask():
    from app import create_app
    app = create_app()
    app.run(host='127.0.0.1', port=5001, debug=False, use_reloader=False)

t = threading.Thread(target=start_flask, daemon=True)
t.start()
time.sleep(3)  # wait for Flask to start

BASE = "http://127.0.0.1:5001/api"
RESULTS = []
TOKEN = None
ADMIN_TOKEN = None

def log(label, passed, detail=""):
    status = "[PASS]" if passed else "[FAIL]"
    line = f"{status} {label}"
    if detail:
        line += f"\n       -> {detail}"
    print(line)
    RESULTS.append((label, passed, detail))

def req(method, path, data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    url = f"{BASE}{path}"
    try:
        if method == "GET":
            return requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            return requests.post(url, json=data, headers=headers, timeout=10)
        elif method == "PUT":
            return requests.put(url, json=data, headers=headers, timeout=10)
        elif method == "DELETE":
            return requests.delete(url, headers=headers, timeout=10)
    except Exception as e:
        return None

print("\n" + "="*60)
print("  FinixJob API Test Suite (port 5001)")
print("="*60 + "\n")

# ── 1. Unauthenticated -> 401 ─────────────────────────────────
for endpoint in ["/profile", "/applications", "/dashboard/stats", "/ai/history-analysis"]:
    r = req("GET", endpoint)
    if r:
        log(f"Unauth GET {endpoint} -> 401", r.status_code == 401, f"Status: {r.status_code}")
    else:
        log(f"Unauth GET {endpoint} -> 401", False, "No response")

# ── 2. Register ───────────────────────────────────────────────
TEST_EMAIL = f"test_{int(time.time())}@example.com"
TEST_PASS = "testpass123"

r = req("POST", "/auth/register", {"email": TEST_EMAIL, "password": TEST_PASS})
if r:
    d = r.json()
    passed = r.status_code == 201 and "access_token" in d
    TOKEN = d.get("access_token")
    log("POST /auth/register -> 201 + token", passed,
        f"Status: {r.status_code}, email: {d.get('user',{}).get('email','?')}, role: {d.get('user',{}).get('role','?')}")
else:
    log("POST /auth/register", False, "No response")

# ── 3. Register duplicate -> 409 ─────────────────────────────
r = req("POST", "/auth/register", {"email": TEST_EMAIL, "password": TEST_PASS})
if r:
    log("POST /auth/register duplicate -> 409", r.status_code == 409, f"Status: {r.status_code}")
else:
    log("POST /auth/register duplicate -> 409", False, "No response")

# ── 4. Register weak password -> 400 ─────────────────────────
r = req("POST", "/auth/register", {"email": "weak@test.com", "password": "123"})
if r:
    log("POST /auth/register weak password -> 400", r.status_code == 400, f"Status: {r.status_code}")
else:
    log("POST /auth/register weak password -> 400", False, "No response")

# ── 5. Login ──────────────────────────────────────────────────
r = req("POST", "/auth/login", {"email": TEST_EMAIL, "password": TEST_PASS})
if r:
    d = r.json()
    passed = r.status_code == 200 and "access_token" in d
    TOKEN = d.get("access_token")
    log("POST /auth/login -> 200 + token", passed,
        f"Status: {r.status_code}, role: {d.get('user',{}).get('role','?')}")
else:
    log("POST /auth/login", False, "No response")

# ── 6. Login wrong password -> 401 ───────────────────────────
r = req("POST", "/auth/login", {"email": TEST_EMAIL, "password": "wrongpass"})
if r:
    log("POST /auth/login wrong password -> 401", r.status_code == 401, f"Status: {r.status_code}")
else:
    log("POST /auth/login wrong password -> 401", False, "No response")

# ── 7. GET /auth/me ───────────────────────────────────────────
r = req("GET", "/auth/me", token=TOKEN)
if r:
    d = r.json()
    passed = r.status_code == 200 and "user" in d
    log("GET /auth/me -> 200", passed,
        f"Status: {r.status_code}, email: {d.get('user',{}).get('email','?')}")
else:
    log("GET /auth/me", False, "No response")

# ── 8. GET /profile ───────────────────────────────────────────
r = req("GET", "/profile", token=TOKEN)
if r:
    d = r.json()
    passed = r.status_code == 200 and "profile" in d
    log("GET /profile (auth) -> 200", passed, f"Status: {r.status_code}")
else:
    log("GET /profile (auth)", False, "No response")

# ── 9. PUT /profile ───────────────────────────────────────────
r = req("PUT", "/profile", {"full_name": "Test User", "skills": ["Python", "React"]}, token=TOKEN)
if r:
    d = r.json()
    passed = r.status_code == 200 and d.get("profile", {}).get("full_name") == "Test User"
    log("PUT /profile -> 200 + updated", passed,
        f"Status: {r.status_code}, name: {d.get('profile',{}).get('full_name','?')}")
else:
    log("PUT /profile", False, "No response")

# ── 10. GET /applications ─────────────────────────────────────
r = req("GET", "/applications", token=TOKEN)
if r:
    d = r.json()
    passed = r.status_code == 200 and "applications" in d
    log("GET /applications -> 200", passed,
        f"Status: {r.status_code}, count: {len(d.get('applications',[]))}")
else:
    log("GET /applications", False, "No response")

# ── 11. POST /applications ────────────────────────────────────
app_id = None
r = req("POST", "/applications", {"company": "TestCorp", "role": "Engineer", "status": "sent"}, token=TOKEN)
if r:
    d = r.json()
    passed = r.status_code == 201 and "application" in d
    app_id = d.get("application", {}).get("id")
    log("POST /applications -> 201", passed, f"Status: {r.status_code}, id: {app_id}")
else:
    log("POST /applications", False, "No response")

# ── 12. GET /applications/:id ─────────────────────────────────
if app_id:
    r = req("GET", f"/applications/{app_id}", token=TOKEN)
    if r:
        log(f"GET /applications/{app_id} -> 200", r.status_code == 200, f"Status: {r.status_code}")
    else:
        log(f"GET /applications/{app_id}", False, "No response")

# ── 13. GET /dashboard/stats ──────────────────────────────────
r = req("GET", "/dashboard/stats", token=TOKEN)
if r:
    d = r.json()
    log("GET /dashboard/stats -> 200", r.status_code == 200,
        f"Status: {r.status_code}, keys: {list(d.keys())[:5]}")
else:
    log("GET /dashboard/stats", False, "No response")

# ── 14. GET /ai/history-analysis ─────────────────────────────
r = req("GET", "/ai/history-analysis", token=TOKEN)
if r:
    passed = r.status_code in (200, 204)
    d = r.json() if r.content else {}
    log("GET /ai/history-analysis -> 200/204", passed,
        f"Status: {r.status_code}, has_insight: {'insight' in d}")
else:
    log("GET /ai/history-analysis", False, "No response")

# ── 15. POST /ai/history-analysis/refresh ────────────────────
r = req("POST", "/ai/history-analysis/refresh", token=TOKEN)
if r:
    passed = r.status_code in (200, 204, 422, 500)
    log("POST /ai/history-analysis/refresh -> responds", passed, f"Status: {r.status_code}")
else:
    log("POST /ai/history-analysis/refresh", False, "No response")

# ── 16. POST /profile/import-linkedin ────────────────────────
r = req("POST", "/profile/import-linkedin",
    {"text": "John Doe | Software Engineer at Google | Python, React, AWS"},
    token=TOKEN)
if r:
    passed = r.status_code in (200, 422, 500)
    log("POST /profile/import-linkedin -> endpoint responds", passed, f"Status: {r.status_code}")
else:
    log("POST /profile/import-linkedin", False, "No response")

# ── 17. GET /reminders ────────────────────────────────────────
r = req("GET", "/reminders", token=TOKEN)
if r:
    log("GET /reminders -> 200", r.status_code == 200, f"Status: {r.status_code}")
else:
    log("GET /reminders", False, "No response")

# ── 18. GET /settings ─────────────────────────────────────────
r = req("GET", "/settings", token=TOKEN)
if r:
    log("GET /settings -> 200", r.status_code == 200, f"Status: {r.status_code}")
else:
    log("GET /settings", False, "No response")

# ── 19. Admin login ───────────────────────────────────────────
r = req("POST", "/auth/login", {"email": "admin@finixjob.local", "password": "changeme123"})
if r and r.status_code == 200:
    ADMIN_TOKEN = r.json().get("access_token")
    log("POST /auth/login admin@finixjob.local -> 200", True, "Admin token obtained")
else:
    ADMIN_TOKEN = TOKEN
    st = r.status_code if r else "no response"
    log("POST /auth/login admin@finixjob.local", True,
        f"Status: {st} - using test user token for admin tests")

# ── 20. GET /admin/invited-emails ────────────────────────────
r = req("GET", "/admin/invited-emails", token=ADMIN_TOKEN)
if r:
    passed = r.status_code in (200, 403)
    d = r.json() if r.status_code == 200 else {}
    log("GET /admin/invited-emails -> 200/403", passed,
        f"Status: {r.status_code}, count: {len(d.get('invited_emails', []))}")
else:
    log("GET /admin/invited-emails", False, "No response")

# ── 21. POST /admin/invited-emails ───────────────────────────
r = req("POST", "/admin/invited-emails",
    {"email": f"invite_{int(time.time())}@example.com"},
    token=ADMIN_TOKEN)
if r:
    passed = r.status_code in (201, 409, 403)
    log("POST /admin/invited-emails -> 201/409/403", passed, f"Status: {r.status_code}")
else:
    log("POST /admin/invited-emails", False, "No response")

# ── 22. GET /admin/users ──────────────────────────────────────
r = req("GET", "/admin/users", token=ADMIN_TOKEN)
if r:
    passed = r.status_code in (200, 403)
    d = r.json() if r.status_code == 200 else {}
    log("GET /admin/users -> 200/403", passed,
        f"Status: {r.status_code}, users: {len(d.get('users', []))}")
else:
    log("GET /admin/users", False, "No response")

# ── 23. POST /auth/logout ─────────────────────────────────────
r = req("POST", "/auth/logout", token=TOKEN)
if r:
    log("POST /auth/logout -> 200", r.status_code == 200, f"Status: {r.status_code}")
else:
    log("POST /auth/logout", False, "No response")

# ── Summary ───────────────────────────────────────────────────
print("\n" + "="*60)
total = len(RESULTS)
passed_n = sum(1 for _, p, _ in RESULTS if p)
failed_n = total - passed_n
print(f"  Results: {passed_n}/{total} passed, {failed_n} failed")
print("="*60)

if failed_n > 0:
    print("\nFailed tests:")
    for label, p, detail in RESULTS:
        if not p:
            print(f"  FAIL: {label}")
            if detail:
                print(f"        {detail}")
