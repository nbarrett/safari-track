@echo off
REM Kill Safari Track development processes (Windows batch launcher)
powershell -ExecutionPolicy Bypass -File "%~dp0kill-dev.ps1"
