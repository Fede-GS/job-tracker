$passed = 0
$failed = 0

function OK($msg) { Write-Host "  PASS: $msg" -ForegroundColor Green; $script:passed++ }
function KO($msg) { Write-Host "  FAIL: $msg" -ForegroundColor Red; $script:failed++ }
function SEC($t)  { Write-Host "`n--- $t ---" -ForegroundColor Cyan }
function CHK($content, $pattern, $label) {
    if ($content -match [regex]::Escape($pattern)) { OK $label } else { KO $label }
}
function RGX($content, $pattern, $label) {
    if ($content -match $pattern) { OK $label } else { KO $label }
}

SEC "1. ApplicationDetail.jsx"
$jsx = Get-Content "frontend/src/pages/ApplicationDetail.jsx" -Raw
CHK $jsx "tailorCoverLetter" "tailorCoverLetter imported"
CHK $jsx "improveText" "improveText imported"
CHK $jsx "showCvPreview" "showCvPreview state"
CHK $jsx "showClPreview" "showClPreview state"
CHK $jsx "clLength" "clLength state"
CHK $jsx "generatingCl" "generatingCl state"
CHK $jsx "showImproveAI" "showImproveAI state"
CHK $jsx "handleGenerateCoverLetter" "handleGenerateCoverLetter handler"
CHK $jsx "handleImproveWithAI" "handleImproveWithAI handler"
CHK $jsx "setFollowupReminder" "setFollowupReminder i18n key"
CHK $jsx "alarm_add" "alarm_add icon"
CHK $jsx "pdf-preview-overlay" "PDF preview overlay"
CHK $jsx "pdf-a4-page" "A4 page element"
CHK $jsx "cl-length-selector" "Length selector"
CHK $jsx "cl-generate-row" "Generate row"
CHK $jsx "cl-improve-panel" "Improve panel"
CHK $jsx "cvPreviewTitle" "CV preview title key"
CHK $jsx "clPreviewTitle" "CL preview title key"
CHK $jsx "exportFromPreview" "Export from preview"
CHK $jsx "clLengthShort" "Short length option"
CHK $jsx "clLengthMedium" "Medium length option"
CHK $jsx "clLengthLong" "Long length option"

SEC "2. ApplicationDetail.css"
$css = Get-Content "frontend/src/pages/ApplicationDetail.css" -Raw
CHK $css ".cl-length-selector" ".cl-length-selector"
CHK $css ".cl-length-btn" ".cl-length-btn"
CHK $css ".cl-generate-row" ".cl-generate-row"
CHK $css ".cl-improve-panel" ".cl-improve-panel"
CHK $css ".pdf-preview-overlay" ".pdf-preview-overlay"
CHK $css ".pdf-preview-container" ".pdf-preview-container"
CHK $css ".pdf-a4-page" ".pdf-a4-page"
CHK $css ".pdf-preview-footer" ".pdf-preview-footer"

SEC "3. App.jsx - AI bubble removal"
$app = Get-Content "frontend/src/App.jsx" -Raw
CHK $app "isApplicationSection" "isApplicationSection variable"
CHK $app "hideAIChat={isApplicationSection}" "hideAIChat prop to Sidebar"
CHK $app "!isApplicationSection" "FloatingAI conditionally hidden"

SEC "4. Sidebar.jsx - hideAIChat prop"
$sidebar = Get-Content "frontend/src/components/layout/Sidebar.jsx" -Raw
CHK $sidebar "hideAIChat" "hideAIChat prop accepted"
CHK $sidebar "!hideAIChat" "AI button conditionally rendered"
CHK $sidebar "hideAIChat = false" "hideAIChat default false"

SEC "5. api/ai.js"
$aiJs = Get-Content "frontend/src/api/ai.js" -Raw
CHK $aiJs "tailorCoverLetter" "tailorCoverLetter exported"
CHK $aiJs "tailor-cover-letter" "Correct endpoint"

SEC "6. i18n keys (EN + IT)"
$en = Get-Content "frontend/src/i18n/locales/en.json" -Raw
$it = Get-Content "frontend/src/i18n/locales/it.json" -Raw
$keys = @("previewPdf","cvPreviewTitle","exportFromPreview","closePreview","coverLetterLength","clLengthShort","clLengthMedium","clLengthLong","generateCoverLetter","generatingCoverLetter","improveWithAI","improveApply","improving","setFollowupReminder","clPreviewTitle","improveInstructions")
foreach ($k in $keys) {
    if ($en -match $k) { OK "EN: $k" } else { KO "EN: $k MISSING" }
    if ($it -match $k) { OK "IT: $k" } else { KO "IT: $k MISSING" }
}

SEC "7. prompts.py"
$prompts = Get-Content "backend/app/utils/prompts.py" -Raw
CHK $prompts "length_instruction" "length_instruction placeholder"

SEC "8. gemini_service.py"
$gemini = Get-Content "backend/app/services/gemini_service.py" -Raw
CHK $gemini "length='medium'" "length default medium"
CHK $gemini "length_map" "length_map dict"
CHK $gemini "SHORT" "Short instruction"
CHK $gemini "LONG" "Long instruction"
CHK $gemini "length_instruction" "length_instruction in prompt"

SEC "9. ai.py"
$aiPy = Get-Content "backend/app/api/ai.py" -Raw
CHK $aiPy "length=data.get" "length from request"

SEC "10. pdf_service.py"
$pdf = Get-Content "backend/app/services/pdf_service.py" -Raw
CHK $pdf "1.8cm" "Tighter margins 1.8cm"
CHK $pdf "9.5pt" "Font size 9.5pt"
CHK $pdf "1.55" "Line-height 1.55"
CHK $pdf "font-weight: 700" "Bold headings"

Write-Host ""
Write-Host "RESULTS: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
