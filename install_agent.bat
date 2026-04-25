@echo off
setlocal enabledelayedexpansion

:: Configuration
set "AGENT_DIR=%APPDATA%\VE6AO-Agent"
set "PYTHON_SCRIPT=%AGENT_DIR%\station_agent.py"
:: Automatically use the current development URL
set "SERVER_URL=https://ais-dev-nsh5nqfkjjuucausuanaw5-119103260736.us-east5.run.app"

echo ========================================
echo   VE6AO Station Heartbeat Agent Setup
echo ========================================
echo.

:: 1. Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in your PATH.
    echo Please install Python 3 from python.org and check "Add Python to PATH".
    pause
    exit /b 1
)

:: 2. Create Application Directory
if not exist "%AGENT_DIR%" (
    echo [INFO] Creating directory: %AGENT_DIR%
    mkdir "%AGENT_DIR%"
)

:: 3. Select Station ID
echo Please select the Station ID for this computer:
echo [1] north (North Station)
echo [2] south (South Station)
echo [3] east  (East Station)
echo [4] west  (West Station)
echo [5] flex  (Flex Station)
echo [6] basic (Basic+ Station)
echo.

set /p CHOICE="Enter number (1-6): "

if "%CHOICE%"=="1" set "STATION_ID=north"
if "%CHOICE%"=="2" set "STATION_ID=south"
if "%CHOICE%"=="3" set "STATION_ID=east"
if "%CHOICE%"=="4" set "STATION_ID=west"
if "%CHOICE%"=="5" set "STATION_ID=flex"
if "%CHOICE%"=="6" set "STATION_ID=basic"

if not defined STATION_ID (
    echo [ERROR] Invalid selection.
    pause
    exit /b 1
)

echo [INFO] Selected Station: %STATION_ID%
echo.

:: 4. Install Dependencies
echo [INFO] Installing required Python libraries (requests)...
python -m pip install requests --quiet
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install 'requests' library. Check your internet connection.
    pause
    exit /b 1
)

:: 5. Create the Python Agent Script
echo [INFO] Writing agent script to: %PYTHON_SCRIPT%
(
    echo import time
    echo import requests
    echo import socket
    echo.
    echo # Configuration
    echo SERVER_URL = "%SERVER_URL%"
    echo STATION_ID = "%STATION_ID%"
    echo INTERVAL = 60 # Seconds
    echo.
    echo def send_heartbeat^(^):
    echo     url = f"{SERVER_URL}/api/stations/{STATION_ID}/heartbeat"
    echo     try:
    echo         response = requests.post^(url, timeout=10^)
    echo         # No output so it runs silently in background
    echo     except Exception:
    echo         pass
    echo.
    echo if __name__ == "__main__":
    echo     while True:
    echo         send_heartbeat^(^)
    echo         time.sleep^(INTERVAL^)
) > "%PYTHON_SCRIPT%"

:: 6. Create Windows Scheduled Task
echo [INFO] Creating background startup task...
:: This uses PowerShell to register a task that runs on Logon
powershell -NoProfile -Command ^
    "$action = New-ScheduledTaskAction -Execute 'pythonw.exe' -Argument '\"%PYTHON_SCRIPT%\"'; " ^
    "$trigger = New-ScheduledTaskTrigger -AtLogOn; " ^
    "$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Days 365); " ^
    "Register-ScheduledTask -TaskName 'VE6AO_Heartbeat_%STATION_ID%' -Action $action -Trigger $trigger -Settings $settings -Force"

if %errorlevel% neq 0 (
    echo [ERROR] Failed to create scheduled task. You may need to run this as Administrator.
) else (
    echo [SUCCESS] Scheduled task created successfully!
)

:: 7. Start the agent immediately (windowless)
echo [INFO] Starting agent in background...
start "" pythonw.exe "%PYTHON_SCRIPT%"

echo.
echo ========================================
echo   SETUP COMPLETE! 
echo ========================================
echo The agent is now running and will start 
echo automatically every time you log in.
echo.
pause
