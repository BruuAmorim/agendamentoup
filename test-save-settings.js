/**
 * TESTE: Salvamento de configurações do moderador
 * Verifica se o erro de parsing JSON foi corrigido
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
          console.log('🔐 LOGIN:', res.statusCode === 200 ? '✅ OK' : '❌ FAIL');
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

// Teste 2: Salvar configurações do moderador
function testSaveSettings() {
  return new Promise((resolve, reject) => {
    const settingsData = {
      company_name: 'Minha Empresa Teste',
      services: ['Corte de cabelo', 'Manicure', 'Pedicure']
    };

    const postData = JSON.stringify(settingsData);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/moderator/settings',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Content-Length': Buffer.byteCount(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('💾 SAVE SETTINGS - Status:', res.statusCode);
        console.log('💾 SAVE SETTINGS - Headers:', {
          'content-type': res.headers['content-type'],
          'content-length': res.headers['content-length']
        });

        try {
          // Tentar parsear como JSON
          const response = JSON.parse(data);
          console.log('💾 SAVE SETTINGS:', res.statusCode === 200 ? '✅ OK' : '❌ FAIL');
          console.log('   Resposta JSON:', response);
          resolve();
        } catch (jsonError) {
          console.log('❌ SAVE SETTINGS: Erro de parsing JSON');
          console.log('   Corpo da resposta (primeiros 500 chars):', data.substring(0, 500));
          console.log('   Erro:', jsonError.message);
          reject(jsonError);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Teste 3: Buscar configurações salvas
function testGetSettings() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/moderator/settings',
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
          console.log('📖 GET SETTINGS:', res.statusCode === 200 ? '✅ OK' : '❌ FAIL');
          console.log('   Configurações:', response);
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
    console.log('🚀 Testando salvamento de configurações do moderador...\n');

    await testLogin();

    if (authToken) {
      await testSaveSettings();
      await testGetSettings();
    } else {
      console.log('❌ Não foi possível fazer login. Crie um moderador primeiro.');
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


