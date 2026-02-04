/**
 * TESTE: Autenticação e rotas do moderador
 * Testa login + acesso às rotas protegidas
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let authToken = null;
let moderatorUser = null;

// Teste 1: Login como moderador
function loginAsModerator() {
  return new Promise((resolve, reject) => {
    console.log('🔐 Fazendo login como moderador...');

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
          console.log(`📧 LOGIN: ${res.statusCode}`);

          if (res.statusCode === 200 && response.token) {
            authToken = response.token;
            moderatorUser = response.user;
            console.log('✅ Login realizado com sucesso');
            console.log(`👤 Usuário: ${response.user.name} (${response.user.role})`);
            resolve(true);
          } else {
            console.log('❌ Falha no login:', response.message || response.error);
            resolve(false);
          }
        } catch (e) {
          console.log('❌ Erro ao fazer login:', e.message);
          console.log('Resposta bruta:', data);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log('❌ Erro de conexão:', err.message);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

// Teste 2: Acessar /api/moderator/stats
function testModeratorStats() {
  return new Promise((resolve, reject) => {
    if (!authToken) {
      console.log('❌ Não há token de autenticação');
      resolve(false);
      return;
    }

    console.log('📊 Testando /api/moderator/stats...');

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
        console.log(`📊 STATS: ${res.statusCode}`);

        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            console.log('✅ Stats obtidos com sucesso:', response);
            resolve(true);
          } catch (e) {
            console.log('❌ Erro ao parsear resposta JSON:', e.message);
            console.log('Resposta bruta:', data);
            resolve(false);
          }
        } else {
          console.log(`❌ Status inesperado: ${res.statusCode}`);
          console.log('Resposta:', data);
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

// Teste 3: Acessar /api/moderator/settings (GET)
function testGetSettings() {
  return new Promise((resolve, reject) => {
    if (!authToken) {
      console.log('❌ Não há token de autenticação');
      resolve(false);
      return;
    }

    console.log('⚙️  Testando GET /api/moderator/settings...');

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
        console.log(`⚙️  GET SETTINGS: ${res.statusCode}`);

        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            console.log('✅ Settings obtidos com sucesso:', response);
            resolve(true);
          } catch (e) {
            console.log('❌ Erro ao parsear resposta JSON:', e.message);
            console.log('Resposta bruta:', data);
            resolve(false);
          }
        } else {
          console.log(`❌ Status inesperado: ${res.statusCode}`);
          console.log('Resposta:', data);
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

// Teste 4: Salvar configurações (PUT)
function testSaveSettings() {
  return new Promise((resolve, reject) => {
    if (!authToken) {
      console.log('❌ Não há token de autenticação');
      resolve(false);
      return;
    }

    console.log('💾 Testando PUT /api/moderator/settings...');

    const settingsData = {
      company_name: 'Empresa Teste Automatizado',
      services: ['Corte de cabelo', 'Manicure', 'Massagem']
    };

    const postData = JSON.stringify(settingsData);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/moderator/settings',
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteCount(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`💾 SAVE SETTINGS: ${res.statusCode}`);

        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            console.log('✅ Settings salvos com sucesso:', response);
            resolve(true);
          } catch (e) {
            console.log('❌ Erro ao parsear resposta JSON:', e.message);
            console.log('Resposta bruta:', data);
            resolve(false);
          }
        } else {
          console.log(`❌ Status inesperado: ${res.statusCode}`);
          console.log('Resposta:', data);
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

// Executar testes
async function runTests() {
  try {
    console.log('🧪 TESTE: Autenticação e Rotas do Moderador\n');

    // 1. Login
    const loginSuccess = await loginAsModerator();
    if (!loginSuccess) {
      console.log('\n❌ IMPOSSÍVEL CONTINUAR: Login falhou');
      return;
    }

    console.log('');

    // 2. Testar stats
    await testModeratorStats();
    console.log('');

    // 3. Testar get settings
    await testGetSettings();
    console.log('');

    // 4. Testar save settings
    await testSaveSettings();

    console.log('\n📋 RESUMO DOS TESTES:');
    console.log('✅ Se todos os testes passaram, as rotas estão funcionando');
    console.log('❌ Se algum teste falhou, verifique os logs acima');

  } catch (error) {
    console.error('❌ Erro nos testes:', error);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  runTests();
}

module.exports = { runTests };


