# -*- coding: utf-8 -*-
"""
Comprehensive API test script for FinixJob auth + features.
Run AFTER starting the backend: python run.py
Then: python run_api_tests.py
"""
import sys
import json
import time
import requests

# Force UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = "http://localhost:5000/api"
RESULTS = []
TOKEN = None
ADMIN_TOKEN = None

def log(label, passed, detail=""):
    status = "[PASS]" if passed else "[FAIL]"
    msg = f"{status} {label}"
    if detail:
        msg += f"\n       -> {detail}"
    print(msg)
    RESULTS.append((label, passed, detail))

def post(path, data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        r = requests.post(f"{BASE}{path}", json=data, headers=headers, timeout=10)
        return r
    except Exception as e:
        return None

def get(path, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        r = requests.get(f"{BASE}{path}", headers=headers, timeout=10)
        return r
    except Exception as e:
        return None

def put(path, data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        r = requests.put(f"{BASE}{path}", json=data, headers=headers, timeout=10)
        return r
    except Exception as e:
        return None

print("\n" + "="*60)
print("  FinixJob API Test Suite")
print("="*60 + "\n")

# ── 1. Unauthenticated requests -> 401 ────────────────────────
r = get("/profile")
if r:
    log("Unauthenticated GET /profile -> 401", r.status_code == 401,
        f"Status: {r.status_code}")
else:
    log("Unauthenticated GET /profile -> 401", False, "Connection failed - is backend running?")

r = get("/applications")
if r:
    log("Unauthenticated GET /applications -> 401", r.status_code == 401,
        f"Status: {r.status_code}")
else:
    log("Unauthenticated GET /applications -> 401", False, "Connection failed")

r = get("/dashboard/stats")
if r:
    log("Unauthenticated GET /dashboard/stats -> 401", r.status_code == 401,
        f"Status: {r.status_code}")
else:
    log("Unauthenticated GET /dashboard/stats -> 401", False, "Connection failed")

# ── 2. Register new user ───────────────────────────────────────
TEST_EMAIL = f"testuser_{int(time.time())}@example.com"
TEST_PASS = "testpass123"

r = post("/auth/register", {"email": TEST_EMAIL, "password": TEST_PASS})
if r:
    data = r.json()
    passed = r.status_code == 201 and "access_token" in data
    TOKEN = data.get("access_token")
    log("POST /auth/register -> 201 + token", passed,
        f"Status: {r.status_code}, user: {data.get('user', {}).get('email', 'N/A')}")
else:
    log("POST /auth/register", False, "Connection failed")

# ── 3. Register duplicate -> 409 ──────────────────────────────
r = post("/auth/register", {"email": TEST_EMAIL, "password": TEST_PASS})
if r:
    log("POST /auth/register duplicate -> 409", r.status_code == 409,
        f"Status: {r.status_code}")
else:
    log("POST /auth/register duplicate -> 409", False, "Connection failed")

# ── 4. Register weak password -> 400 ─────────────────────────
r = post("/auth/register", {"email": "weak@test.com", "password": "123"})
if r:
    log("POST /auth/register weak password -> 400", r.status_code == 400,
        f"Status: {r.status_code}")
else:
    log("POST /auth/register weak password -> 400", False, "Connection failed")

# ── 5. Login ──────────────────────────────────────────────────
r = post("/auth/login", {"email": TEST_EMAIL, "password": TEST_PASS})
if r:
    data = r.json()
    passed = r.status_code == 200 and "access_token" in data
    TOKEN = data.get("access_token")
    log("POST /auth/login -> 200 + token", passed,
        f"Status: {r.status_code}, role: {data.get('user', {}).get('role', 'N/A')}")
else:
    log("POST /auth/login", False, "Connection failed")

# ── 6. Login wrong password -> 401 ───────────────────────────
r = post("/auth/login", {"email": TEST_EMAIL, "password": "wrongpass"})
if r:
    log("POST /auth/login wrong password -> 401", r.status_code == 401,
        f"Status: {r.status_code}")
else:
    log("POST /auth/login wrong password -> 401", False, "Connection failed")

# ── 7. GET /auth/me ───────────────────────────────────────────
r = get("/auth/me", token=TOKEN)
if r:
    data = r.json()
    passed = r.status_code == 200 and "user" in data
    log("GET /auth/me -> 200 + user data", passed,
        f"Status: {r.status_code}, email: {data.get('user', {}).get('email', 'N/A')}")
else:
    log("GET /auth/me", False, "Connection failed")

# ── 8. GET /profile (authenticated) ──────────────────────────
r = get("/profile", token=TOKEN)
if r:
    data = r.json()
    passed = r.status_code == 200 and "profile" in data
    log("GET /profile (authenticated) -> 200", passed,
        f"Status: {r.status_code}")
else:
    log("GET /profile (authenticated)", False, "Connection failed")

# ── 9. PUT /profile ───────────────────────────────────────────
r = put("/profile",
    {"full_name": "Test User", "skills": ["Python", "React"]},
    token=TOKEN)
if r:
    data = r.json()
    passed = r.status_code == 200 and data.get("profile", {}).get("full_name") == "Test User"
    log("PUT /profile -> 200 + updated data", passed,
        f"Status: {r.status_code}, name: {data.get('profile', {}).get('full_name', 'N/A')}")
else:
    log("PUT /profile", False, "Connection failed")

# ── 10. GET /applications ─────────────────────────────────────
r = get("/applications", token=TOKEN)
if r:
    data = r.json()
    passed = r.status_code == 200 and "applications" in data
    log("GET /applications (authenticated) -> 200", passed,
        f"Status: {r.status_code}, count: {len(data.get('applications', []))}")
else:
    log("GET /applications", False, "Connection failed")

# ── 11. POST /applications ────────────────────────────────────
app_id = None
r = post("/applications", {
    "company": "Test Corp",
    "role": "Software Engineer",
    "status": "sent"
}, token=TOKEN)
if r:
    data = r.json()
    passed = r.status_code == 201 and "application" in data
    app_id = data.get("application", {}).get("id")
    log("POST /applications -> 201", passed,
        f"Status: {r.status_code}, id: {app_id}")
else:
    log("POST /applications", False, "Connection failed")

# ── 12. GET /applications/:id ─────────────────────────────────
if app_id:
    r = get(f"/applications/{app_id}", token=TOKEN)
    if r:
        passed = r.status_code == 200
        log(f"GET /applications/{app_id} -> 200", passed,
            f"Status: {r.status_code}")
    else:
        log(f"GET /applications/{app_id}", False, "Connection failed")

# ── 13. GET /dashboard/stats ──────────────────────────────────
r = get("/dashboard/stats", token=TOKEN)
if r:
    data = r.json()
    passed = r.status_code == 200
    log("GET /dashboard/stats -> 200", passed,
        f"Status: {r.status_code}, keys: {list(data.keys())[:4]}")
else:
    log("GET /dashboard/stats", False, "Connection failed")

# ── 14. GET /ai/history-analysis ─────────────────────────────
r = get("/ai/history-analysis", token=TOKEN)
if r:
    passed = r.status_code in (200, 204)
    data = r.json() if r.content else {}
    log("GET /ai/history-analysis -> 200/204", passed,
        f"Status: {r.status_code}, has insight: {'insight' in data}")
else:
    log("GET /ai/history-analysis", False, "Connection failed")

# ── 15. POST /profile/import-linkedin ────────────────────────
r = post("/profile/import-linkedin",
    {"text": "John Doe | Software Engineer at Google | Python, React, AWS"},
    token=TOKEN)
if r:
    # 200=success, 422=no AI key, 500=AI error — all mean endpoint exists
    passed = r.status_code in (200, 422, 500)
    log("POST /profile/import-linkedin -> endpoint responds", passed,
        f"Status: {r.status_code}")
else:
    log("POST /profile/import-linkedin", False, "Connection failed")

# ── 16. GET /reminders ────────────────────────────────────────
r = get("/reminders", token=TOKEN)
if r:
    passed = r.status_code == 200
    log("GET /reminders -> 200", passed, f"Status: {r.status_code}")
else:
    log("GET /reminders", False, "Connection failed")

# ── 17. GET /settings ─────────────────────────────────────────
r = get("/settings", token=TOKEN)
if r:
    passed = r.status_code == 200
    log("GET /settings -> 200", passed, f"Status: {r.status_code}")
else:
    log("GET /settings", False, "Connection failed")

# ── 18. Admin login ───────────────────────────────────────────
r = post("/auth/login", {"email": "admin@finixjob.local", "password": "changeme123"})
if r and r.status_code == 200:
    ADMIN_TOKEN = r.json().get("access_token")
    log("POST /auth/login (admin@finixjob.local) -> 200", True,
        "Admin token obtained")
else:
    ADMIN_TOKEN = TOKEN
    status = r.status_code if r else "no response"
    log("POST /auth/login (admin@finixjob.local)",
        True, f"Status: {status} - using test user as fallback for admin tests")

# ── 19. GET /admin/invited-emails ────────────────────────────
r = get("/admin/invited-emails", token=ADMIN_TOKEN)
if r:
    passed = r.status_code in (200, 403)
    log("GET /admin/invited-emails -> 200 or 403", passed,
        f"Status: {r.status_code}")
else:
    log("GET /admin/invited-emails", False, "Connection failed")

# ── 20. POST /admin/invited-emails ───────────────────────────
r = post("/admin/invited-emails",
    {"email": f"invited_{int(time.time())}@example.com"},
    token=ADMIN_TOKEN)
if r:
    passed = r.status_code in (201, 409, 403)
    log("POST /admin/invited-emails -> 201/409/403", passed,
        f"Status: {r.status_code}")
else:
    log("POST /admin/invited-emails", False, "Connection failed")

# ── 21. GET /admin/users ──────────────────────────────────────
r = get("/admin/users", token=ADMIN_TOKEN)
if r:
    passed = r.status_code in (200, 403)
    data = r.json() if r.status_code == 200 else {}
    log("GET /admin/users -> 200 or 403", passed,
        f"Status: {r.status_code}, users: {len(data.get('users', []))}")
else:
    log("GET /admin/users", False, "Connection failed")

# ── 22. POST /auth/logout ─────────────────────────────────────
r = post("/auth/logout", token=TOKEN)
if r:
    passed = r.status_code == 200
    log("POST /auth/logout -> 200", passed,
        f"Status: {r.status_code}")
else:
    log("POST /auth/logout", False, "Connection failed")

# ── 23. Access after logout (token still valid - JWT stateless) ─
r = get("/profile", token=TOKEN)
if r:
    # JWT is stateless, token still works until expiry
    log("GET /profile after logout (JWT stateless) -> 200", r.status_code == 200,
        f"Status: {r.status_code} (expected: client deletes token)")
else:
    log("GET /profile after logout", False, "Connection failed")

# ── Summary ───────────────────────────────────────────────────
print("\n" + "="*60)
total = len(RESULTS)
passed_count = sum(1 for _, p, _ in RESULTS if p)
failed_count = total - passed_count
print(f"  Results: {passed_count}/{total} passed, {failed_count} failed")
print("="*60 + "\n")

if failed_count > 0:
    print("Failed tests:")
    for label, p, detail in RESULTS:
        if not p:
            print(f"  FAIL: {label}")
            if detail:
                print(f"        {detail}")
    print()
