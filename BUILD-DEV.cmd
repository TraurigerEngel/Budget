@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0BUILD-DEV.ps1" %*
exit /b %ERRORLEVEL%
