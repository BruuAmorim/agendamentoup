@echo off
echo ========================================
echo   Verificação de Status - EvAgendamento
echo ========================================
echo.

echo Verificando portas...
echo.

netstat -ano | findstr :3000 >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Backend API (porta 3000): ATIVO
) else (
    echo ❌ Backend API (porta 3000): INATIVO
)

netstat -ano | findstr :8080 >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Frontend Web (porta 8080): ATIVO
) else (
    echo ❌ Frontend Web (porta 8080): INATIVO
)

echo.
echo ========================================
echo   URLs de Acesso
echo ========================================
echo.
echo Frontend Web:
echo - Login:     http://localhost:8080/css/index.html
echo - Admin:     http://localhost:8080/admin/dashboard
echo - Usuario:   http://localhost:8080/app/agendamentos
echo.
echo API REST:
echo - Health:    http://localhost:3000/api/health
echo - API Base:  http://localhost:3000/api
echo.
echo Pressione qualquer tecla para continuar...
pause > nul







