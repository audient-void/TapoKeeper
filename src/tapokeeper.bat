@echo off
REM TapoKeeper Windows Launcher
REM This batch file runs TapoKeeper using Node.js

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0

REM Run the Node.js application with all passed arguments
node "%SCRIPT_DIR%index.js" %*
