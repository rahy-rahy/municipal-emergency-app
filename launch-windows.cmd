@echo off
setlocal enabledelayedexpansion
title Municipal Emergency Reporting App

echo ==============================================================
echo   Municipal Emergency Reporting App  -  local run
echo ==============================================================
echo.

cd /d "%~dp0"

REM ---- Check Node.js ----
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on this computer.
  echo.
  echo This project needs Node.js version 18 or newer.
  echo   1. Open https://nodejs.org in your browser.
  echo   2. Download the LTS version for Windows and install it.
  echo   3. Close this window, then run launch-windows.cmd again.
  echo.
  pause
  exit /b 1
)

REM ---- Prepare .env ----
if not exist ".env" (
  echo Creating .env from .env.example
  copy /y ".env.example" ".env" >nul
)

REM ---- Start database ----
where docker >nul 2>nul
if errorlevel 1 (
  echo Docker was not found.
  echo.
  echo This app needs a PostgreSQL database. You have two choices:
  echo   A. Install Docker Desktop from https://www.docker.com/products/docker-desktop
  echo      then run this launcher again. It will start Postgres for you.
  echo   B. Use your own PostgreSQL. Open .env and set DATABASE_URL to your
  echo      connection string, then run this launcher again.
  echo.
  pause
  exit /b 1
) else (
  echo Starting the database with Docker...
  docker compose up -d
  if errorlevel 1 (
    echo Could not start the database with Docker. Make sure Docker Desktop is running.
    pause
    exit /b 1
  )
  echo Waiting for the database to be ready...
  set /a tries=0
  :waitdb
  docker exec mera_db pg_isready -U mera_app -d mera >nul 2>nul
  if errorlevel 1 (
    set /a tries+=1
    if !tries! geq 30 (
      echo The database did not become ready in time.
      pause
      exit /b 1
    )
    timeout /t 2 >nul
    goto waitdb
  )
  echo Database is ready.
)

REM ---- Install dependencies ----
if not exist "node_modules" (
  echo Installing dependencies. This runs once and may take a minute...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

REM ---- Migrate and seed ----
echo Preparing the database...
call npm run setup
if errorlevel 1 (
  echo Database setup failed.
  pause
  exit /b 1
)

REM ---- Start the app ----
echo.
echo Starting the app. Open http://localhost:3000 in your browser.
echo Press Ctrl + C in this window to stop.
echo.
call npm start

endlocal
