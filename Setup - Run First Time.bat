@echo off
title Math Quest — First Time Setup
echo.
echo  =============================================
echo    Math Quest — Installing dependencies
echo  =============================================
echo.
echo  This only needs to run once. Please wait...
echo.

:: Try pip directly, then python -m pip as fallback
pip install flask "qrcode[pil]" 2>nul
if errorlevel 1 (
    python -m pip install flask "qrcode[pil]"
)

if errorlevel 1 (
    echo.
    echo  ERROR: Could not install packages.
    echo.
    echo  Make sure Python is installed and that you checked
    echo  "Add Python to PATH" during installation.
    echo.
    echo  Download Python from: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo.
echo  =============================================
echo    Done! Setup complete.
echo.
echo    You can now double-click "Math Quest.vbs"
echo    any time to start the game.
echo  =============================================
echo.
pause
