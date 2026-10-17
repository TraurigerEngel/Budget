@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0BUILD-RELEASE.ps1" %*
exit /b %ERRORLEVEL%
