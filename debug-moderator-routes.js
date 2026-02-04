/**
 * DEBUG: Verificar se as rotas do moderador estão funcionando
 * Execute este script para diagnosticar os erros 404/500
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Teste 1: Verificar se o servidor está rodando
function testServerHealth() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      console.log(`🏥 SERVER HEALTH: ${res.statusCode}`);
      if (res.statusCode === 200) {
        console.log('✅ Servidor está rodando');
      } else {
        console.log('❌ Servidor não responde corretamente');
      }
      resolve(res.statusCode === 200);
    });

    req.on('error', (err) => {
      console.log('❌ Servidor não está rodando:', err.message);
      resolve(false);
    });

    req.end();
  });
}

// Teste 2: Verificar se rota existe (sem autenticação)
function testRouteExists() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/moderator/stats',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      console.log(`📍 ROUTE CHECK (/api/moderator/stats): ${res.statusCode}`);

      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 401) {
          console.log('✅ Rota existe (401 = não autorizado, esperado sem token)');
        } else if (res.statusCode === 404) {
          console.log('❌ Rota NÃO existe (404 = não encontrada)');
        } else {
          console.log(`⚠️  Status inesperado: ${res.statusCode}`);
          console.log('Resposta:', data.substring(0, 200));
        }
        resolve(res.statusCode);
      });
    });

    req.on('error', (err) => {
      console.log('❌ Erro na requisição:', err.message);
      resolve(null);
    });

    req.end();
  });
}

// Teste 3: Verificar se as rotas estão registradas no Express
function testRouteRegistration() {
  return new Promise((resolve) => {
    console.log('\n🔍 Verificando registro de rotas...');

    // Tentar fazer uma requisição OPTIONS para ver se a rota responde
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/moderator/stats',
      method: 'OPTIONS'
    };

    const req = http.request(options, (res) => {
      console.log(`🔧 OPTIONS /api/moderator/stats: ${res.statusCode}`);
      if (res.statusCode !== 404) {
        console.log('✅ Rota está registrada no Express');
      } else {
        console.log('❌ Rota NÃO está registrada no Express');
      }
      resolve(res.statusCode !== 404);
    });

    req.on('error', () => {
      console.log('❌ Erro na verificação OPTIONS');
      resolve(false);
    });

    req.end();
  });
}

// Teste 4: Verificar se há problemas no middleware
function testMiddleware() {
  return new Promise((resolve) => {
    console.log('\n🛡️  Verificando middleware...');

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      console.log(`🔐 AUTH MIDDLEWARE: ${res.statusCode}`);
      if (res.statusCode === 400) {
        console.log('✅ Middleware de autenticação está funcionando');
      } else {
        console.log('⚠️  Middleware pode ter problemas');
      }
      resolve(res.statusCode);
    });

    req.on('error', () => {
      resolve(null);
    });

    req.write(JSON.stringify({}));
    req.end();
  });
}

async function runDiagnostics() {
  try {
    console.log('🔧 DIAGNÓSTICO: Rotas do Moderador\n');

    // 1. Verificar se servidor está rodando
    const serverUp = await testServerHealth();
    if (!serverUp) {
      console.log('\n❌ SERVIDOR NÃO ESTÁ RODANDO');
      console.log('💡 Execute: npm start');
      return;
    }

    // 2. Verificar se rota existe
    await testRouteExists();

    // 3. Verificar registro de rotas
    await testRouteRegistration();

    // 4. Verificar middleware
    await testMiddleware();

    console.log('\n📋 RESUMO DO DIAGNÓSTICO:');
    console.log('1. ✅ Servidor está rodando');
    console.log('2. Se rota retorna 404, o problema é no registro de rotas');
    console.log('3. Se rota retorna 500, o problema é no controller/middleware');
    console.log('4. Se rota retorna 401, está funcionando (falta autenticação)');

  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  runDiagnostics();
}

module.exports = { runDiagnostics };


