@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0MAKE-FINAL-RELEASE.ps1" %*
exit /b %ERRORLEVEL%
