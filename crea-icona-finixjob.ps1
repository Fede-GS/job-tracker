# FinixJob - Crea icona desktop con logo personalizzato

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$pngPath   = Join-Path $scriptDir "frontend\public\logo.png"
$icoPath   = Join-Path $scriptDir "frontend\public\logo.ico"
$batPath   = Join-Path $scriptDir "start.bat"

Write-Host ""
Write-Host " ========================================"
Write-Host "   FinixJob - Creazione icona desktop"
Write-Host " ========================================"
Write-Host ""

# Verifica che il logo esista
if (-not (Test-Path $pngPath)) {
    Write-Host " [ERRORE] Logo non trovato: $pngPath"
    Read-Host "Premi INVIO per uscire"
    exit 1
}
Write-Host " [OK] Logo trovato"

# Converti PNG in ICO (formato ICO con PNG embedded, supportato da Windows Vista+)
Write-Host " [1/3] Conversione PNG -> ICO..."

Add-Type -AssemblyName System.Drawing

try {
    $bitmap   = [System.Drawing.Bitmap]::new($pngPath)
    $resized  = [System.Drawing.Bitmap]::new(256, 256)
    $graphics = [System.Drawing.Graphics]::FromImage($resized)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($bitmap, 0, 0, 256, 256)
    $graphics.Dispose()

    $ms = [System.IO.MemoryStream]::new()
    $resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytes = $ms.ToArray()
    $ms.Dispose()
    $bitmap.Dispose()
    $resized.Dispose()

    # Scrivi file ICO: header (6 byte) + directory entry (16 byte) + dati PNG
    $icoStream = [System.IO.FileStream]::new($icoPath, [System.IO.FileMode]::Create)
    $writer    = [System.IO.BinaryWriter]::new($icoStream)

    # ICO Header
    $writer.Write([uint16]0)   # Reserved
    $writer.Write([uint16]1)   # Type: ICO
    $writer.Write([uint16]1)   # Numero immagini

    # ICONDIRENTRY
    $writer.Write([byte]0)     # Width  (0 = 256)
    $writer.Write([byte]0)     # Height (0 = 256)
    $writer.Write([byte]0)     # ColorCount
    $writer.Write([byte]0)     # Reserved
    $writer.Write([uint16]1)   # Planes
    $writer.Write([uint16]32)  # BitCount
    $writer.Write([uint32]$pngBytes.Length)
    $writer.Write([uint32]22)  # Offset = 6 + 16 = 22

    # Dati immagine
    $writer.Write($pngBytes)
    $writer.Close()
    $icoStream.Close()

    Write-Host " [OK] ICO creato: $icoPath"
}
catch {
    Write-Host " [ERRORE] Conversione fallita: $_"
    Read-Host "Premi INVIO per uscire"
    exit 1
}

# Crea collegamento sul Desktop
Write-Host " [2/3] Creazione collegamento desktop..."

try {
    $shell    = New-Object -ComObject WScript.Shell
    $desktop  = $shell.SpecialFolders("Desktop")
    $lnkPath  = Join-Path $desktop "FinixJob.lnk"

    $shortcut = $shell.CreateShortcut($lnkPath)
    $shortcut.TargetPath       = $batPath
    $shortcut.WorkingDirectory = $scriptDir
    $shortcut.Description      = "Avvia FinixJob - Job Tracker"
    $shortcut.IconLocation     = "$icoPath,0"
    $shortcut.WindowStyle      = 1
    $shortcut.Save()

    Write-Host " [OK] Collegamento creato: $lnkPath"
}
catch {
    Write-Host " [ERRORE] Creazione collegamento fallita: $_"
    Read-Host "Premi INVIO per uscire"
    exit 1
}

Write-Host ""
Write-Host " [3/3] Completato!"
Write-Host ""
Write-Host " ========================================"
Write-Host "   Icona FinixJob creata sul Desktop!"
Write-Host "   Doppio clic per avviare l'app."
Write-Host " ========================================"
Write-Host ""
