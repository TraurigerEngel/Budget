@echo off
chcp 65001 >nul
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0INIT-DEMO-DATA.ps1"
if errorlevel 1 (echo Demo initialization failed. & pause & exit /b 1)
echo Done.
pause
