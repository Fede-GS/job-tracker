@echo off
title FinixJob - Installa Icona Desktop
color 0A

echo.
echo  ========================================
echo    FinixJob - Installazione Icona
echo  ========================================
echo.

:: Esegui lo script PowerShell con bypass della policy di esecuzione
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0crea-icona-finixjob.ps1"

echo.
pause
