@echo off
title FinixJob - Stop
color 0C

echo.
echo  ========================================
echo        FINIXJOB - Stop
echo  ========================================
echo.

echo  Chiusura backend (porta 5000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo  Chiusura frontend (porta 5173)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo  [OK] FinixJob fermato.
echo.
timeout /t 2 /nobreak >nul
