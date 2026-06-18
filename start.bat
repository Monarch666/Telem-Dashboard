@echo off
title MAVLink Telemetry Dashboard
color 0A

echo.
echo  ============================================
echo   Wingspan Global -- MAVLink Telem Dashboard  
echo  ============================================
echo.

:: Navigate to the script's directory
cd /d "%~dp0"

:: ── Check Python ────────────────────────────────────────────────────────────
where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH.
    echo         Install Python 3.10+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

:: ── Check npm / Node ─────────────────────────────────────────────────────────
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js / npm is not installed or not in PATH.
    echo         Install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: ── Install npm dependencies if node_modules is missing ──────────────────────
if not exist "node_modules\" (
    echo [INFO] First run detected. Installing npm packages...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed. Check your internet connection.
        pause
        exit /b 1
    )
)

:: ── Start the Python MAVLink WebSocket bridge in a new window ─────────────────
echo [1/2] Starting MAVLink WebSocket bridge (ws://localhost:8765)...
start "MAVLink Bridge" cmd /k "python server.py && pause"

:: Wait 2 seconds for the server to bind its port
timeout /t 2 /nobreak >nul

:: ── Start Vite dev server (opens browser automatically) ───────────────────────
echo [2/2] Starting Vite frontend (http://localhost:4000)...
echo.
echo  Both services are now running.
echo  Close this window or press Ctrl+C to stop the frontend.
echo  Close the "MAVLink Bridge" window to stop the backend.
echo.

call npm run dev

echo.
echo  Frontend stopped. Close the MAVLink Bridge window manually if needed.
pause
