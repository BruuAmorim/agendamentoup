@echo off
cd /d "%~dp0"
echo ========================================
echo   EvAgendamento - Sistema SaaS
echo ========================================
echo.
echo Iniciando sistema completo...
echo.

echo [1/2] Iniciando Backend API...
start "Backend API" cmd /k "cd /d %~dp0 && call start-backend.bat"

timeout /t 3 /nobreak > nul

echo [2/2] Iniciando Servidor Web...
start "Frontend Server" cmd /k "cd /d %~dp0 && npx http-server frontend -p 8080 --cors"

echo.
echo ========================================
echo   Sistema iniciado com sucesso!
echo ========================================
echo.
echo URLs de acesso:
echo - Login:     http://localhost:8080/css/ index.html
echo - Admin:     http://localhost:8080/admin/dashboard
echo - Usuario:   http://localhost:8080/app/agendamentos
echo.
echo ========================================
echo   API REST - Integrações Externas
echo ========================================
echo - API Base:  http://localhost:3000/api
echo - Health:    http://localhost:3000/api/health
echo - Slots:     http://localhost:3000/api/slots/:date
echo - Docs:      http://localhost:3000/api/health
echo.
echo Configurar integrações (n8n):
echo - Acesse: http://localhost:8080/admin/integrations
echo.
echo Contas de teste:
echo Admin:  brunadevv@gmail.com / admin123
echo User:   usuarioteste@gmail.com / Mudar@123
echo.
echo ========================================
echo   Verificação de Status
echo ========================================
echo.
echo Aguarde alguns segundos para os servidores inicializarem...
timeout /t 5 /nobreak > nul
echo.
echo Verificando status dos servidores...
call check-status.bat
echo.
echo Sistema pronto! Pressione qualquer tecla para fechar...
pause > nul
