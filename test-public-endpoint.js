/**
 * TESTE: Endpoint público do moderador
 * Testa apenas /api/moderator/company-info (não requer autenticação)
 */

const http = require('http');

function testCompanyInfo() {
  return new Promise((resolve) => {
    console.log('🏢 Testando /api/moderator/company-info (rota pública)...');

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/moderator/company-info',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`📊 Status: ${res.statusCode}`);
        console.log(`📊 Content-Type: ${res.headers['content-type']}`);

        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            console.log('✅ Resposta JSON válida:');
            console.log('   Success:', response.success);
            console.log('   Company Name:', response.data?.company_name);
            console.log('   Services:', response.data?.services);
            resolve(true);
          } catch (e) {
            console.log('❌ Erro ao parsear JSON:', e.message);
            console.log('   Resposta bruta:', data.substring(0, 200));
            resolve(false);
          }
        } else {
          console.log('❌ Status inesperado');
          console.log('   Resposta:', data);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log('❌ Erro de conexão:', err.message);
      resolve(false);
    });

    req.end();
  });
}

async function runPublicTest() {
  console.log('🌐 TESTE: Endpoint Público do Moderador\n');

  const success = await testCompanyInfo();

  console.log('\n📋 RESULTADO:');
  if (success) {
    console.log('✅ Endpoint público funcionando');
    console.log('💡 Problema pode estar nas rotas protegidas (autenticação)');
  } else {
    console.log('❌ Mesmo endpoint público falhando');
    console.log('💡 Problema pode ser no controller ou banco de dados');
  }
}

if (require.main === module) {
  runPublicTest();
}


