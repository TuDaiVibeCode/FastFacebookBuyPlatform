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
set "POSTGRES_HOST_PORT=15432"
set "REDIS_HOST_PORT=16379"
set "CHROMA_HOST_PORT=18001"
set "RETRIES=120"

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
for /F "tokens=2 delims==" %%A in (`findstr "^POSTGRES_HOST_PORT=" "%ENV_FILE%"`) do (
  set "POSTGRES_HOST_PORT=%%A"
)
for /F "tokens=2 delims==" %%A in (`findstr "^REDIS_HOST_PORT=" "%ENV_FILE%"`) do (
  set "REDIS_HOST_PORT=%%A"
)
for /F "tokens=2 delims==" %%A in (`findstr "^CHROMA_HOST_PORT=" "%ENV_FILE%"`) do (
  set "CHROMA_HOST_PORT=%%A"
)

where docker >nul 2>&1
if errorlevel 1 (
  echo docker command not found.
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo npm not found. Frontend and mobile start will be skipped.
)

echo Starting backend stack...
cd /d "%BACKEND_DIR%\infra\docker"
docker compose --env-file "%ENV_FILE%" -f "%COMPOSE_FILE%" up -d --build
if errorlevel 1 exit /b 1
cd /d "%ROOT_DIR%"

call :wait_for_tcp PostgreSQL "%POSTGRES_HOST_PORT%"
if errorlevel 1 exit /b 1
call :wait_for_tcp Redis "%REDIS_HOST_PORT%"
if errorlevel 1 exit /b 1
call :wait_for_tcp ChromaDB "%CHROMA_HOST_PORT%"
if errorlevel 1 exit /b 1
call :wait_for_http Backend "http://127.0.0.1:%API_HTTP_PORT%/api/v1/health"
if errorlevel 1 exit /b 1

where npm >nul 2>&1
if errorlevel 1 (
  echo npm missing; skip frontend and mobile.
) else (
  if not exist "%FRONTEND_DIR%\node_modules\package.json" (
    echo Frontend dependencies missing. Running npm ci...
    pushd "%FRONTEND_DIR%"
    npm ci
    popd
  )
  if not exist "%MOBILE_DIR%\node_modules\package.json" (
    echo Mobile dependencies missing. Running npm ci...
    pushd "%MOBILE_DIR%"
    npm ci
    popd
  )

  start "Deal Radar Frontend" cmd /k "cd /d \"%FRONTEND_DIR%\" && npm run dev -- --port %FRONTEND_PORT% > \"%RUN_LOG_DIR%\frontend.log\" 2>&1"
  start "Deal Radar Mobile" cmd /k "cd /d \"%MOBILE_DIR%\" && npm run start -- --port %MOBILE_PORT% > \"%RUN_LOG_DIR%\mobile.log\" 2>&1"
)

echo Frontend URL:  http://localhost:%FRONTEND_PORT%
echo API URL:      http://localhost:%API_HTTP_PORT%
echo Logs: %RUN_LOG_DIR%
pause

goto :eof

:wait_for_tcp
set "NAME=%~1"
set "PORT=%~2"
set /a "ATTEMPTS=0"
:WAIT_TCP_LOOP
if !ATTEMPTS! GEQ %RETRIES% (
  echo Timeout waiting for %NAME% on port %PORT%
  exit /b 1
)
powershell -NoProfile -Command "try { $c = New-Object System.Net.Sockets.TcpClient('127.0.0.1',[int]'%PORT%'); $c.Close(); exit 0 } catch { exit 1 }"
if errorlevel 1 (
  timeout /t 1 >nul
  set /a ATTEMPTS+=1
  goto WAIT_TCP_LOOP
)
echo %NAME% is ready
exit /b 0

:wait_for_http
set "NAME=%~1"
set "URL=%~2"
set /a "ATTEMPTS=0"
:WAIT_HTTP_LOOP
if !ATTEMPTS! GEQ %RETRIES% (
  echo Timeout waiting for %NAME% (%URL%)
  exit /b 1
)
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing '%URL%' -TimeoutSec 3; if ($r.StatusCode -eq 200) { exit 0 } ; exit 1 } catch { exit 1 }"
if errorlevel 1 (
  timeout /t 1 >nul
  set /a ATTEMPTS+=1
  goto WAIT_HTTP_LOOP
)
echo %NAME% is ready
exit /b 0
