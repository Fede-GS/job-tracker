$base = "http://localhost:5000"
$ok  = 0
$err = 0

Write-Host ""
Write-Host " === Test endpoint corretti (documenti, interviste, job search) ==="
Write-Host ""

$tests = @(
    @{ method="GET"; path="/api/applications/1/documents";           label="Documents per app 1" },
    @{ method="GET"; path="/api/applications/15/interviews";          label="Interviews per app 15" },
    @{ method="GET"; path="/api/job-search/search?q=engineer&country=it"; label="Job Search (Adzuna)" },
    @{ method="GET"; path="/api/job-search/smart-suggestions";        label="Job Search Smart Suggestions" }
)

foreach ($t in $tests) {
    try {
        $r = Invoke-WebRequest -Uri ($base + $t.path) -Method $t.method -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        Write-Host (" [OK  $($r.StatusCode)] $($t.method) $($t.path)") -ForegroundColor Green
        $ok++
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if (-not $code) { $code = "ERR" }
        Write-Host (" [FAIL $code] $($t.method) $($t.path)  ->  $($_.Exception.Message)") -ForegroundColor Red
        $err++
    }
}

Write-Host ""
Write-Host " RISULTATI FINALI: $ok OK  |  $err FALLITI"
Write-Host ""
