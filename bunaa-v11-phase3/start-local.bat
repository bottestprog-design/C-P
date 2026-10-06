@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  start "Bunaa V11 Server" cmd /k node server.mjs
  timeout /t 2 /nobreak >nul
  start "" http://127.0.0.1:8765/
  exit /b 0
)
where py >nul 2>nul
if %errorlevel%==0 (
  start "Bunaa V11 Server" cmd /k py -m http.server 8765
  timeout /t 2 /nobreak >nul
  start "" http://127.0.0.1:8765/
  exit /b 0
)
where python >nul 2>nul
if %errorlevel%==0 (
  start "Bunaa V11 Server" cmd /k python -m http.server 8765
  timeout /t 2 /nobreak >nul
  start "" http://127.0.0.1:8765/
  exit /b 0
)
echo لم يتم العثور على Node.js أو Python.
echo ثبّت أحدهما ثم شغّل start-local.bat مرة أخرى.
pause
