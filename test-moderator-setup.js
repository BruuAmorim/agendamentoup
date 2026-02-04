/**
 * Teste básico da implementação do Moderador
 * Verifica se os endpoints estão funcionando
 */

const axios = require('axios');

async function testModeratorSetup() {
  console.log('🧪 Testando implementação do Moderador...\n');

  const baseUrl = 'http://localhost:3000/api';

  try {
    // 1. Testar health check
    console.log('1. Verificando API...');
    const health = await axios.get(`${baseUrl}/health`);
    console.log('✅ API funcionando');

    // 2. Testar endpoint de informações da empresa
    console.log('2. Testando informações da empresa...');
    const companyInfo = await axios.get(`${baseUrl}/moderator/company-info`);
    console.log('✅ Endpoint company-info funcionando');
    console.log('   Empresa:', companyInfo.data.data.company_name || 'Não configurada');
    console.log('   Serviços:', companyInfo.data.data.services.length, 'configurados');

    // 3. Testar geração de protocolo curto
    console.log('3. Testando geração de protocolo...');
    // Criar um agendamento de teste para ver o protocolo
    const testAppointment = {
      customer_name: 'Cliente Teste Moderador',
      customer_phone: '(11) 99999-9999',
      service_type: 'Corte de Cabelo',
      appointment_date: new Date().toISOString().split('T')[0],
      appointment_time: '10:00',
      duration_minutes: 60
    };

    const createResponse = await axios.post(`${baseUrl}/appointments`, testAppointment);
    if (createResponse.data.success) {
      console.log('✅ Protocolo gerado:', createResponse.data.data.protocol);
      console.log('   Comprimento:', createResponse.data.data.protocol.length, 'caracteres');

      // Verificar formato do protocolo
      const protocol = createResponse.data.data.protocol;
      if (protocol.startsWith('AG-') && protocol.length >= 6 && protocol.length <= 8) {
        console.log('✅ Formato do protocolo CORRETO');
      } else {
        console.log('❌ Formato do protocolo INCORRETO');
      }
    }

    console.log('\n🎉 Testes básicos do Moderador passaram!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Execute as migrações SQL do arquivo migration-moderator-features.sql');
    console.log('2. Crie um usuário com role MODERATOR via painel admin');
    console.log('3. Teste a funcionalidade completa');

  } catch (error) {
    console.error('❌ Erro nos testes:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Resposta:', error.response.data);
    }

    console.log('\n💡 Possíveis soluções:');
    console.log('1. Certifique-se de que o servidor está rodando');
    console.log('2. Execute as migrações SQL primeiro');
    console.log('3. Verifique se a porta 3000 está livre');
  }
}

testModeratorSetup();


