# FinixJob - Test completo API endpoints

$base = "http://localhost:5000"
$ok   = 0
$err  = 0

function Test-Endpoint {
    param($method, $path, $body = $null, $contentType = "application/json")
    try {
        $uri = $base + $path
        if ($body) {
            $r = Invoke-WebRequest -Uri $uri -Method $method -Body $body -ContentType $contentType -UseBasicParsing -TimeoutSec 8 -ErrorAction Stop
        } else {
            $r = Invoke-WebRequest -Uri $uri -Method $method -UseBasicParsing -TimeoutSec 8 -ErrorAction Stop
        }
        Write-Host (" [OK  $($r.StatusCode)] $method $path") -ForegroundColor Green
        $script:ok++
        return $r.Content
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if (-not $code) { $code = "ERR" }
        Write-Host (" [FAIL $code] $method $path  ->  $($_.Exception.Message)") -ForegroundColor Red
        $script:err++
        return $null
    }
}

Write-Host ""
Write-Host " ============================================"
Write-Host "   FinixJob - Test API completo"
Write-Host " ============================================"
Write-Host ""

# --- DASHBOARD ---
Write-Host " [DASHBOARD]"
Test-Endpoint "GET"  "/api/dashboard/stats"
Test-Endpoint "GET"  "/api/dashboard/timeline"
Test-Endpoint "GET"  "/api/dashboard/timeline?period=weekly"
Test-Endpoint "GET"  "/api/dashboard/timeline?period=daily"
Test-Endpoint "GET"  "/api/dashboard/recent"
Test-Endpoint "GET"  "/api/dashboard/deadline-alerts"
Test-Endpoint "GET"  "/api/dashboard/funnel"
Test-Endpoint "GET"  "/api/dashboard/followup-suggestions"
Write-Host ""

# --- APPLICATIONS ---
Write-Host " [APPLICATIONS]"
$listContent = Test-Endpoint "GET"  "/api/applications"
Test-Endpoint "GET"  "/api/applications?status=sent"
Test-Endpoint "GET"  "/api/applications?search=developer"
Test-Endpoint "GET"  "/api/applications/calendar"

# Prendi il primo ID disponibile per test GET singolo
$firstId = $null
if ($listContent) {
    try {
        $parsed = $listContent | ConvertFrom-Json
        if ($parsed.applications -and $parsed.applications.Count -gt 0) {
            $firstId = $parsed.applications[0].id
            Test-Endpoint "GET" "/api/applications/$firstId"
        }
    } catch {}
}
Write-Host ""

# --- PROFILE ---
Write-Host " [PROFILE]"
Test-Endpoint "GET"  "/api/profile"
Test-Endpoint "GET"  "/api/profile/onboarding-status"
Write-Host ""

# --- SETTINGS ---
Write-Host " [SETTINGS]"
Test-Endpoint "GET"  "/api/settings"
Write-Host ""

# --- REMINDERS ---
Write-Host " [REMINDERS]"
Test-Endpoint "GET"  "/api/reminders"
Write-Host ""

# --- DOCUMENTS ---
Write-Host " [DOCUMENTS]"
Test-Endpoint "GET"  "/api/documents"
Write-Host ""

# --- INTERVIEWS ---
Write-Host " [INTERVIEWS]"
Test-Endpoint "GET"  "/api/interviews"
Write-Host ""

# --- JOB SEARCH ---
Write-Host " [JOB SEARCH]"
Test-Endpoint "GET"  "/api/job-search/sources"
Write-Host ""

# --- POST: Crea candidatura di test ---
Write-Host " [POST - Crea candidatura test]"
$newApp = '{"company":"TestCo","role":"Test Engineer","status":"draft","applied_date":"2025-01-01"}'
$createContent = Test-Endpoint "POST" "/api/applications" $newApp
$newId = $null
if ($createContent) {
    try {
        $parsed = $createContent | ConvertFrom-Json
        $newId = $parsed.application.id
        Write-Host "   -> Creata candidatura ID: $newId" -ForegroundColor Cyan
    } catch {}
}
Write-Host ""

# --- DELETE: Elimina candidatura di test ---
if ($newId) {
    Write-Host " [DELETE - Elimina candidatura test]"
    Test-Endpoint "DELETE" "/api/applications/$newId"
    Write-Host ""
}

# --- RIEPILOGO ---
Write-Host " ============================================"
Write-Host "   RISULTATI: $ok OK  |  $err FALLITI"
Write-Host " ============================================"
Write-Host ""
