@echo off
setlocal enabledelayedexpansion

set "ROOT_DIR=%~dp0.."
set "BACKEND_DIR=%ROOT_DIR%\backend"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"
set "MOBILE_DIR=%ROOT_DIR%\mobile"
set "COMPOSE_FILE=%BACKEND_DIR%\infra\docker\docker-compose.yml"
set "ENV_FILE=%BACKEND_DIR%\.env"
set "RUN_LOG_DIR=%ROOT_DIR%\.run"

if not exist "%RUN_LOG_DIR%" mkdir "%RUN_LOG_DIR%"
if not exist "%ENV_FILE%" (
  if exist "%BACKEND_DIR%\.env.example" (
    copy "%BACKEND_DIR%\.env.example" "%ENV_FILE%" >nul
  )
)

start "DealRadar API" cmd /k "cd /d \"%BACKEND_DIR%\infra\docker\" && docker compose --env-file \"%ENV_FILE%\" -f \"%COMPOSE_FILE%\" up --build"
echo Started backend stack (check Docker Desktop).

start "Deal Radar Frontend" cmd /k "cd /d \"%FRONTEND_DIR%\" && npm run dev -- --port 3000 > \"%RUN_LOG_DIR%\frontend.log\" 2>&1"
start "Deal Radar Mobile" cmd /k "cd /d \"%MOBILE_DIR%\" && npm run start -- --port 8081 > \"%RUN_LOG_DIR%\mobile.log\" 2>&1"

echo Frontend URL:  http://localhost:3000
echo API URL:      http://localhost:18000
echo Logs: %RUN_LOG_DIR%
pause
