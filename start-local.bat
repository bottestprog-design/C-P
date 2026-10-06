@echo off
cd /d "%~dp0"
where py >nul 2>nul && (start "" py -m http.server 8765 & timeout /t 2 >nul & start "" http://127.0.0.1:8765/index.html & exit /b 0)
where python >nul 2>nul && (start "" python -m http.server 8765 & timeout /t 2 >nul & start "" http://127.0.0.1:8765/index.html & exit /b 0)
echo لم يتم العثور على Python. افتح index.html مباشرة.
pause
