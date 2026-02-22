@echo off
title FinixJob - Avvio
color 0A

echo.
echo  ========================================
echo        FINIXJOB - Avvio
echo  ========================================
echo.

:: Percorso base (dove si trova questo file)
set "ROOT=%~dp0"

:: Controlla Python
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERRORE] Python non trovato!
    echo  Installalo da https://python.org
    pause
    exit /b 1
)
echo  [OK] Python trovato

:: Controlla Node
node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERRORE] Node.js non trovato!
    echo  Installalo da https://nodejs.org
    pause
    exit /b 1
)
echo  [OK] Node.js trovato

:: Installa dipendenze backend
echo.
echo  [1/4] Controllo dipendenze backend...
pip install -r "%ROOT%backend\requirements.txt" --quiet >nul 2>&1

:: Installa dipendenze frontend se mancano
if not exist "%ROOT%frontend\node_modules" (
    echo  [2/4] Installazione dipendenze frontend...
    cd /d "%ROOT%frontend"
    call npm install >nul 2>&1
    cd /d "%ROOT%"
) else (
    echo  [2/4] Dipendenze frontend OK
)

:: Avvia Backend in una nuova finestra
echo  [3/4] Avvio backend porta 5000...
start "" "%ROOT%_run_backend.cmd"

:: Attendi backend
echo         Attendo avvio backend...
timeout /t 3 /nobreak >nul

:: Avvia Frontend in una nuova finestra
echo  [4/4] Avvio frontend porta 5173...
start "" "%ROOT%_run_frontend.cmd"

:: Attendi frontend e apri browser
timeout /t 5 /nobreak >nul
echo.
echo  [OK] Backend su http://localhost:5000
echo  [OK] Frontend su http://localhost:5173
echo.

:: Apri browser
start http://localhost:5173

echo.
echo  ========================================
echo   FinixJob in esecuzione!
echo.
echo   Per chiudere: chiudi le finestre
echo   Backend (blu) e Frontend (gialla)
echo  ========================================
echo.
pause
