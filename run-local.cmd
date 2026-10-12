@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (echo Node.js is required. & exit /b 1)
if not exist node_modules\three\package.json (
  call npm.cmd ci --no-audit --no-fund
  if errorlevel 1 exit /b 1
)
call npm.cmd run compile
if errorlevel 1 exit /b 1
set "PORT=%~1"
if not defined PORT set "PORT=8080"
echo Research field: http://127.0.0.1:%PORT%/explorer.html
echo Retained inventory: http://127.0.0.1:%PORT%/retrospective/2026-10-12/site/trail-map.html
node tools\serve-static.mjs %PORT%
exit /b %errorlevel%
