@echo off
setlocal
rem Resolve the installer next to this launcher, independent of the current folder.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*
set "setup_result=%errorlevel%"
if not "%setup_result%"=="0" pause
exit /b %setup_result%
