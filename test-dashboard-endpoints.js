/**
 * Script de teste para os novos endpoints do dashboard
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testEndpoints() {
  console.log('🧪 Testando endpoints do Dashboard...\n');

  try {
    // 1. Testar health check
    console.log('1. Testando /health...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check OK:', healthResponse.data.status);

    // 2. Testar endpoint de estatísticas diárias
    console.log('\n2. Testando /dashboard/daily-stats...');
    const dailyStatsResponse = await axios.get(`${BASE_URL}/dashboard/daily-stats`);
    console.log('✅ Daily stats OK');
    console.log('   Total de dias:', dailyStatsResponse.data.data.length);
    if (dailyStatsResponse.data.data.length > 0) {
      console.log('   Primeiro dia:', dailyStatsResponse.data.data[0]);
      console.log('   Último dia:', dailyStatsResponse.data.data[dailyStatsResponse.data.data.length - 1]);
    }

    // 3. Testar endpoint de top serviços
    console.log('\n3. Testando /dashboard/top-services...');
    const topServicesResponse = await axios.get(`${BASE_URL}/dashboard/top-services`);
    console.log('✅ Top services OK');
    console.log('   Total de serviços:', topServicesResponse.data.data.length);
    if (topServicesResponse.data.data.length > 0) {
      console.log('   Top serviço:', topServicesResponse.data.data[0]);
    }

    // 4. Testar endpoint de resumo
    console.log('\n4. Testando /dashboard/summary...');
    const summaryResponse = await axios.get(`${BASE_URL}/dashboard/summary`);
    console.log('✅ Summary OK');
    console.log('   Resumo mensal:', summaryResponse.data.data.monthly);
    console.log('   Resumo semanal:', summaryResponse.data.data.weekly);
    console.log('   Agendamentos hoje:', summaryResponse.data.data.today);

    console.log('\n🎉 Todos os endpoints do dashboard estão funcionando!');

  } catch (error) {
    console.error('❌ Erro ao testar endpoints:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Resposta:', error.response.data);
    }
  }
}

// Executar testes
testEndpoints();




