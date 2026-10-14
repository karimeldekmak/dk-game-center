@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-local-site.ps1" %*
if errorlevel 1 (
  echo.
  echo The local website could not start. Check the error message above.
  pause
)
