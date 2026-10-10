@echo off
setlocal
set "SITE_ZIP=%~1"
if "%SITE_ZIP%"=="" (
  echo Drag the Bunaa exported website ZIP onto this file, or paste its full path.
  set /p "SITE_ZIP=Website ZIP path: "
)
if not exist "%SITE_ZIP%" (
  echo ERROR: File not found: "%SITE_ZIP%"
  pause
  exit /b 2
)
python "%~dp0complete_export_assets.py" "%SITE_ZIP%"
if errorlevel 1 (
  echo.
  echo Asset completion failed. See the error above.
) else (
  echo.
  echo Check the generated -with-assets.zip beside the original.
)
pause
