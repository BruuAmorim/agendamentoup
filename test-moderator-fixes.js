/**
 * TESTE: Correções do Moderador
 * Verifica se os erros 403 e 500 foram resolvidos
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let authToken = null;
let moderatorId = null;

// Teste 1: Login como moderador
function testLogin() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: 'moderador@teste.com',
      password: '123456'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteCount(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('🔐 TESTE LOGIN:', res.statusCode === 200 ? '✅ OK' : '❌ FAIL');
          console.log('   Resposta:', response);

          if (res.statusCode === 200 && response.token) {
            authToken = response.token;
            moderatorId = response.user?.id;
          }
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Teste 2: Verificar acesso ao /api/moderator/stats (deve ser 200, não 403)
function testModeratorStats() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/moderator/stats',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('📊 TESTE STATS:', res.statusCode === 200 ? '✅ OK' : '❌ FAIL');
          console.log('   Status:', res.statusCode);
          console.log('   Resposta:', response);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Teste 3: Verificar acesso ao /api/moderator/company-info (deve ser 200, não 500)
function testCompanyInfo() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/moderator/company-info',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('🏢 TESTE COMPANY-INFO:', res.statusCode === 200 ? '✅ OK' : '❌ FAIL');
          console.log('   Status:', res.statusCode);
          console.log('   Resposta:', response);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Executar testes
async function runTests() {
  try {
    console.log('🚀 Iniciando testes das correções do Moderador...\n');

    await testLogin();

    if (authToken) {
      await testModeratorStats();
      await testCompanyInfo();
    } else {
      console.log('❌ Não foi possível fazer login. Crie um usuário moderador primeiro.');
    }

    console.log('\n✅ Testes concluídos!');
  } catch (error) {
    console.error('❌ Erro nos testes:', error);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  runTests();
}

module.exports = { runTests };


