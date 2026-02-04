@echo off
echo 🔍 Verificando processos na porta 3000...
netstat -ano | findstr :3000 > nul
if %errorlevel% neq 0 (
    echo ✅ Porta 3000 está liberada
    goto :start_server
)

echo ⚠️  Encontrados processos na porta 3000
echo.

echo 📋 Processos encontrados:
netstat -ano | findstr :3000

echo.
echo 🛑 Matando processos...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Matando PID %%a...
    taskkill /PID %%a /F > nul 2>&1
)

echo ⏳ Aguardando liberação da porta...
timeout /t 2 /nobreak > nul

echo 🔍 Verificando novamente...
netstat -ano | findstr :3000 > nul
if %errorlevel% neq 0 (
    echo ✅ Porta liberada com sucesso
) else (
    echo ⚠️  Ainda há processos na porta. Tente fechar manualmente.
    pause
    exit /b 1
)

:start_server
echo.
echo 🚀 Iniciando servidor...
npm start
echo 🔍 Verificando processos na porta 3000...
netstat -ano | findstr :3000 > nul
if %errorlevel% neq 0 (
    echo ✅ Porta 3000 está liberada
    goto :start_server
)

echo ⚠️  Encontrados processos na porta 3000
echo.

echo 📋 Processos encontrados:
netstat -ano | findstr :3000

echo.
echo 🛑 Matando processos...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Matando PID %%a...
    taskkill /PID %%a /F > nul 2>&1
)

echo ⏳ Aguardando liberação da porta...
timeout /t 2 /nobreak > nul

echo 🔍 Verificando novamente...
netstat -ano | findstr :3000 > nul
if %errorlevel% neq 0 (
    echo ✅ Porta liberada com sucesso
) else (
    echo ⚠️  Ainda há processos na porta. Tente fechar manualmente.
    pause
    exit /b 1
)

:start_server
echo.
echo 🚀 Iniciando servidor...
npm start




