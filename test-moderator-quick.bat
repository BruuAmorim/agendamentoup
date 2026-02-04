@echo off
echo 🚀 Teste Rápido: Rotas do Moderador
echo.

REM Verificar se servidor está rodando
echo 🔍 Verificando se servidor está rodando...
curl -s http://localhost:3000/api/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ SERVIDOR NÃO ESTÁ RODANDO
    echo 💡 Execute: npm start
    pause
    exit /b 1
)
echo ✅ Servidor está rodando
echo.

REM Testar rota sem autenticação (deve dar 401)
echo 🛡️  Testando middleware de autenticação...
curl -s -o /dev/null -w "📍 /api/moderator/stats (sem auth): %%{http_code}\n" http://localhost:3000/api/moderator/stats
echo.

REM Testar rota company-info (pública)
echo 🌐 Testando rota pública...
curl -s -o /dev/null -w "🏢 /api/moderator/company-info: %%{http_code}\n" http://localhost:3000/api/moderator/company-info
echo.

REM Testar login
echo 🔐 Testando login...
for /f "tokens=*" %%i in ('curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"moderador@teste.com\",\"password\":\"123456\"}" ^| findstr "token"') do set LOGIN_RESULT=%%i

if defined LOGIN_RESULT (
    echo ✅ Login realizado com sucesso
    echo 🔑 Token obtido
) else (
    echo ❌ Falha no login - verifique se existe usuário moderador
    echo 💡 Crie um usuário com role 'moderator' no painel admin
)

echo.
echo 📋 PRÓXIMOS PASSOS:
echo 1. Se servidor não está rodando: npm start
echo 2. Se login falha: Crie usuário moderador no admin
echo 3. Se tudo OK: Teste completo com node test-moderator-auth.js

pause


