@echo off
cd /d "%~dp0"
echo ========================================
echo   Iniciando Backend - EvAgendamento
echo ========================================
echo.

echo Matando processos na porta 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo.

echo Iniciando servidor...
npm start

pause







