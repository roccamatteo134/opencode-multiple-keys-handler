@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0switch-opencode-key.ps1" %*
exit /b %errorlevel%
