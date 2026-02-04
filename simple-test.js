/**
 * TESTE SIMPLES: Servidor e rotas básicas
 */

const http = require('http');

function testHealth() {
  return new Promise((resolve) => {
    console.log('🏥 Testando /api/health...');

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      if (res.statusCode === 200) {
        console.log('✅ Servidor está funcionando');
        resolve(true);
      } else {
        console.log('❌ Servidor com problemas');
        resolve(false);
      }
    });

    req.on('error', (err) => {
      console.log('❌ Erro de conexão:', err.message);
      resolve(false);
    });

    req.end();
  });
}

function testAuthLogin() {
  return new Promise((resolve) => {
    console.log('🔐 Testando /api/auth/login...');

    const postData = JSON.stringify({
      email: 'admin@teste.com',
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
        console.log(`Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          console.log('✅ Login funcionando');
          resolve(true);
        } else {
          console.log('❌ Login com problema:', data);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log('❌ Erro na requisição:', err.message);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

function testCompanyInfo() {
  return new Promise((resolve) => {
    console.log('🏢 Testando /api/moderator/company-info (rota pública)...');

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/moderator/company-info',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          console.log('✅ Rota pública funcionando');
          console.log('Resposta:', data);
          resolve(true);
        } else {
          console.log('❌ Rota pública com problema:', data);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log('❌ Erro na requisição:', err.message);
      resolve(false);
    });

    req.end();
  });
}

async function runSimpleTests() {
  console.log('🧪 TESTES SIMPLES\n');

  const healthOk = await testHealth();
  console.log('');

  if (healthOk) {
    await testAuthLogin();
    console.log('');
    await testCompanyInfo();
  }

  console.log('\n📋 RESUMO:');
  console.log('✅ Se /api/health funciona = Servidor OK');
  console.log('✅ Se /api/auth/login funciona = Autenticação OK');
  console.log('✅ Se /api/moderator/company-info funciona = Rotas públicas OK');
  console.log('❌ Se alguma rota falha = Problema específico');
}

if (require.main === module) {
  runSimpleTests();
}