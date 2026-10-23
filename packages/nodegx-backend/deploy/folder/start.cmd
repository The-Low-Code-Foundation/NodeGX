@echo off
rem Starts this NodeGX app - see DEPLOY.md. Options: --port <n> (default: the first free port from 3000).
where node >nul 2>nul || (echo This app needs Node.js 22.13 or later: https://nodejs.org & exit /b 1)
node "%~dp0start.js" %*
