@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo    VIREN'S KHAKHRA - SYSTEM LAUNCHER
echo ==========================================
echo.

:: Get Local IP Address (Preferring 192.168 or 10.x ranges)
set IP=localhost
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set _tempIP=%%a
    set _tempIP=!_tempIP: =!
    echo [DEBUG] Found IP: !_tempIP!
    if "!_tempIP:~0,7!"=="192.168" set IP=!_tempIP!
    if "!_tempIP:~0,3!"=="10." set IP=!_tempIP!
)

echo.
echo ==========================================
echo [INFO] Access the system on your NETWORK:
echo Link: http://%IP%:5173
echo.
echo (If that doesn't work, check your Firewall)
echo ==========================================
echo.

echo [1/2] Starting Backend (Port 8000)...
start "Khakhra Backend" cmd /k "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

echo [2/2] Starting Frontend (Port 5173)...
cd frontend
start "Khakhra Frontend" cmd /k "npm run dev -- --host 0.0.0.0"

echo.
echo [SUCCESS] System is starting up in separate terminals.
echo [DONE] Close those terminals to stop the servers.
echo.
pause
