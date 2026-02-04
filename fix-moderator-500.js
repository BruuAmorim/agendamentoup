/**
 * FIX: Corrigir erro 500 do moderador
 * Executa setup da tabela + teste automático
 */

const { setupModeratorTable } = require('./setup_moderator_table');
const http = require('http');

async function testModeratorSettings() {
  return new Promise((resolve) => {
    console.log('🧪 Testando salvamento de configurações...');

    // Primeiro, tentar fazer login
    const loginData = JSON.stringify({
      email: 'moderador@teste.com',
      password: '123456'
    });

    const loginOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteCount(loginData)
      }
    };

    const loginReq = http.request(loginOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const loginResponse = JSON.parse(data);
          if (res.statusCode === 200 && loginResponse.token) {
            console.log('✅ Login realizado');

            // Agora testar salvamento
            const settingsData = JSON.stringify({
              company_name: 'Empresa Teste Fix',
              services: ['Corte', 'Escova']
            });

            const saveOptions = {
              hostname: 'localhost',
              port: 3000,
              path: '/api/moderator/settings',
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${loginResponse.token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteCount(settingsData)
              }
            };

            const saveReq = http.request(saveOptions, (saveRes) => {
              let saveData = '';
              saveRes.on('data', (chunk) => saveData += chunk);
              saveRes.on('end', () => {
                console.log(`💾 Status do salvamento: ${saveRes.statusCode}`);
                if (saveRes.statusCode === 200) {
                  console.log('✅ Salvamento funcionando!');
                  resolve(true);
                } else {
                  console.log('❌ Salvamento ainda falhando:', saveData);
                  resolve(false);
                }
              });
            });

            saveReq.on('error', () => resolve(false));
            saveReq.write(settingsData);
            saveReq.end();

          } else {
            console.log('❌ Falha no login, pulando teste de salvamento');
            resolve(false);
          }
        } catch (e) {
          console.log('❌ Erro no login:', e.message);
          resolve(false);
        }
      });
    });

    loginReq.on('error', () => resolve(false));
    loginReq.write(loginData);
    loginReq.end();
  });
}

async function runFix() {
  try {
    console.log('🔧 CORREÇÃO: Erro 500 do Moderador\n');

    console.log('📋 PASSO 1: Setup da tabela...');
    await setupModeratorTable();

    console.log('\n📋 PASSO 2: Verificando se servidor está rodando...');
    // Teste simples de conectividade
    const serverTest = await new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/health',
        method: 'GET'
      }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.end();
    });

    if (!serverTest) {
      console.log('⚠️  Servidor não está rodando. Inicie com: npm start');
      console.log('💡 Depois execute este script novamente.');
      return;
    }

    console.log('📋 PASSO 3: Testando funcionalidade...');
    const testResult = await testModeratorSettings();

    console.log('\n📋 RESULTADO FINAL:');
    if (testResult) {
      console.log('🎉 CORREÇÃO BEM SUCEDIDA!');
      console.log('✅ Tabela criada');
      console.log('✅ Salvamento funcionando');
      console.log('🚀 Agora você pode usar as configurações do moderador.');
    } else {
      console.log('⚠️  Setup executado, mas teste falhou');
      console.log('💡 Verifique os logs do servidor para mais detalhes');
      console.log('💡 Certifique-se de ter um usuário moderador criado');
    }

  } catch (error) {
    console.error('❌ Erro durante correção:', error);
  }
}

if (require.main === module) {
  runFix();
}


