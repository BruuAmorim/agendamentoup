@echo off
cd /d "%~dp0"
echo ========================================
echo   Iniciando Frontend - EvAgendamento
echo ========================================
echo.

echo Matando processos na porta 8080...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8080" ^| find "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo.

echo Iniciando servidor frontend...
start "Frontend Server" cmd /k "cd /d %~dp0 && npx http-server frontend -p 8080 --cors"

echo.
echo ========================================
echo   Frontend iniciado!
echo ========================================
echo.
echo URLs de acesso:
echo - Login:     http://localhost:8080/css/index.html
echo - Admin:     http://localhost:8080/admin/dashboard
echo - Usuario:   http://localhost:8080/app/agendamentos
echo.
echo Pressione qualquer tecla para fechar...
pause > nul

