@echo off
echo ========================================
echo 🧪 TESTE RÁPIDO - EvAgendamento
echo ========================================
echo.

echo 🔍 Verificando se servidor está rodando...
netstat -ano | findstr :3000 > nul
if %errorlevel% neq 0 (
    echo ❌ Servidor NÃO está rodando na porta 3000
    echo.
    echo 💡 Execute primeiro: npm start
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Servidor está rodando na porta 3000
)

echo.
echo 🏥 Testando Health Check...
curl -s http://localhost:3000/health | findstr "OK" > nul
if %errorlevel% neq 0 (
    echo ❌ Health Check falhou
) else (
    echo ✅ Health Check passou
)

echo.
echo 📝 Testando criação de agendamento...
for /f %%i in ('powershell -command "Get-Date -Format 'yyyy-MM-dd'"') do set TODAY=%%i
for /f %%i in ('powershell -command "Get-Date (Get-Date).AddDays(1) -Format 'yyyy-MM-dd'"') do set TOMORROW=%%i

curl -s -X POST http://localhost:3000/api/appointments ^
  -H "Content-Type: application/json" ^
  -d "{\"customer_name\":\"Teste Rapido\",\"customer_phone\":\"(11) 99999-9999\",\"appointment_date\":\"%TOMORROW%\",\"appointment_time\":\"10:00\",\"duration_minutes\":60,\"notes\":\"Teste automatizado\"}" ^
  | findstr "success.*true" > nul

if %errorlevel% neq 0 (
    echo ❌ Criação de agendamento falhou
) else (
    echo ✅ Criação de agendamento passou
)

echo.
echo 📋 Testando listagem de agendamentos...
curl -s "http://localhost:3000/api/appointments?date=%TOMORROW%" ^
  | findstr "success.*true" > nul

if %errorlevel% neq 0 (
    echo ❌ Listagem de agendamentos falhou
) else (
    echo ✅ Listagem de agendamentos passou
)

echo.
echo 🎯 Testando verificação de disponibilidade...
curl -s "http://localhost:3000/api/appointments/available/%TOMORROW%?duration=60" ^
  | findstr "success.*true" > nul

if %errorlevel% neq 0 (
    echo ❌ Verificação de disponibilidade falhou
) else (
    echo ✅ Verificação de disponibilidade passou
)

echo.
echo ========================================
echo 🎉 TESTE CONCLUÍDO!
echo ========================================
echo.
echo 📱 Para testar a interface completa:
echo    - Abra: frontend/index.html
echo    - Ou diagnóstico: frontend/diagnostico.html
echo.
echo 📖 Para testes detalhados, consulte:
echo    - TESTE_COMPLETO.md
echo    - TROUBLESHOOTING.md
echo.
pause
echo ========================================
echo 🧪 TESTE RÁPIDO - EvAgendamento
echo ========================================
echo.

echo 🔍 Verificando se servidor está rodando...
netstat -ano | findstr :3000 > nul
if %errorlevel% neq 0 (
    echo ❌ Servidor NÃO está rodando na porta 3000
    echo.
    echo 💡 Execute primeiro: npm start
    echo.
    pause
    exit /b 1
) else (
    echo ✅ Servidor está rodando na porta 3000
)

echo.
echo 🏥 Testando Health Check...
curl -s http://localhost:3000/health | findstr "OK" > nul
if %errorlevel% neq 0 (
    echo ❌ Health Check falhou
) else (
    echo ✅ Health Check passou
)

echo.
echo 📝 Testando criação de agendamento...
for /f %%i in ('powershell -command "Get-Date -Format 'yyyy-MM-dd'"') do set TODAY=%%i
for /f %%i in ('powershell -command "Get-Date (Get-Date).AddDays(1) -Format 'yyyy-MM-dd'"') do set TOMORROW=%%i

curl -s -X POST http://localhost:3000/api/appointments ^
  -H "Content-Type: application/json" ^
  -d "{\"customer_name\":\"Teste Rapido\",\"customer_phone\":\"(11) 99999-9999\",\"appointment_date\":\"%TOMORROW%\",\"appointment_time\":\"10:00\",\"duration_minutes\":60,\"notes\":\"Teste automatizado\"}" ^
  | findstr "success.*true" > nul

if %errorlevel% neq 0 (
    echo ❌ Criação de agendamento falhou
) else (
    echo ✅ Criação de agendamento passou
)

echo.
echo 📋 Testando listagem de agendamentos...
curl -s "http://localhost:3000/api/appointments?date=%TOMORROW%" ^
  | findstr "success.*true" > nul

if %errorlevel% neq 0 (
    echo ❌ Listagem de agendamentos falhou
) else (
    echo ✅ Listagem de agendamentos passou
)

echo.
echo 🎯 Testando verificação de disponibilidade...
curl -s "http://localhost:3000/api/appointments/available/%TOMORROW%?duration=60" ^
  | findstr "success.*true" > nul

if %errorlevel% neq 0 (
    echo ❌ Verificação de disponibilidade falhou
) else (
    echo ✅ Verificação de disponibilidade passou
)

echo.
echo ========================================
echo 🎉 TESTE CONCLUÍDO!
echo ========================================
echo.
echo 📱 Para testar a interface completa:
echo    - Abra: frontend/index.html
echo    - Ou diagnóstico: frontend/diagnostico.html
echo.
echo 📖 Para testes detalhados, consulte:
echo    - TESTE_COMPLETO.md
echo    - TROUBLESHOOTING.md
echo.
pause




