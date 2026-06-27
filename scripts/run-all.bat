@echo off
setlocal enabledelayedexpansion

set "ROOT_DIR=%~dp0.."
set "BACKEND_DIR=%ROOT_DIR%\backend"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"
set "MOBILE_DIR=%ROOT_DIR%\mobile"
set "COMPOSE_FILE=%BACKEND_DIR%\infra\docker\docker-compose.yml"
set "ENV_FILE=%BACKEND_DIR%\.env"
set "RUN_LOG_DIR=%ROOT_DIR%\.run"
set "API_HTTP_PORT=18000"
set "FRONTEND_PORT=3000"
set "MOBILE_PORT=8081"

if not exist "%RUN_LOG_DIR%" mkdir "%RUN_LOG_DIR%"
if not exist "%ENV_FILE%" (
  if exist "%BACKEND_DIR%\.env.example" (
    copy "%BACKEND_DIR%\.env.example" "%ENV_FILE%" >nul
  )
)

for /F "tokens=2 delims==" %%A in (`findstr "^API_HTTP_PORT=" "%ENV_FILE%"`) do (
  set "API_HTTP_PORT=%%A"
)
for /F "tokens=2 delims==" %%A in (`findstr "^FRONTEND_PORT=" "%ENV_FILE%"`) do (
  set "FRONTEND_PORT=%%A"
)
for /F "tokens=2 delims==" %%A in (`findstr "^MOBILE_PORT=" "%ENV_FILE%"`) do (
  set "MOBILE_PORT=%%A"
)

start "DealRadar API" cmd /k "cd /d \"%BACKEND_DIR%\infra\docker\" && docker compose --env-file \"%ENV_FILE%\" -f \"%COMPOSE_FILE%\" up --build"
echo Started backend stack (check Docker Desktop).

start "Deal Radar Frontend" cmd /k "cd /d \"%FRONTEND_DIR%\" && npm run dev -- --port %FRONTEND_PORT% > \"%RUN_LOG_DIR%\frontend.log\" 2>&1"
start "Deal Radar Mobile" cmd /k "cd /d \"%MOBILE_DIR%\" && npm run start -- --port %MOBILE_PORT% > \"%RUN_LOG_DIR%\mobile.log\" 2>&1"

echo Frontend URL:  http://localhost:%FRONTEND_PORT%
echo API URL:      http://localhost:%API_HTTP_PORT%
echo Logs: %RUN_LOG_DIR%
pause
