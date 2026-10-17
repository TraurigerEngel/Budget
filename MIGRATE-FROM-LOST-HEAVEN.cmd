@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0MIGRATE-FROM-LOST-HEAVEN.ps1" %*
exit /b %ERRORLEVEL%
