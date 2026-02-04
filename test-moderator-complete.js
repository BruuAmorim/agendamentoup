/**
 * Teste completo das funcionalidades do Moderador
 */

const axios = require('axios');

async function testModeratorComplete() {
  console.log('🎯 TESTE COMPLETO - FUNCIONALIDADES DO MODERADOR');
  console.log('='.repeat(60));

  const baseUrl = 'http://localhost:3000/api';
  let testResults = {
    passed: 0,
    failed: 0,
    total: 0
  };

  function logTest(name, success, details = '') {
    testResults.total++;
    if (success) {
      testResults.passed++;
      console.log(`✅ ${name}`);
      if (details) console.log(`   ${details}`);
    } else {
      testResults.failed++;
      console.log(`❌ ${name}`);
      if (details) console.log(`   ${details}`);
    }
  }

  try {
    // 1. Verificar saúde do sistema
    console.log('1. 🔍 VERIFICAÇÃO DO SISTEMA');
    try {
      const health = await axios.get(`${baseUrl}/health`);
      logTest('Backend ativo', health.data.status === 'OK');
    } catch (error) {
      logTest('Backend ativo', false, 'Servidor não responde');
      return;
    }

    // 2. Testar login como admin
    console.log('\n2. 🔐 AUTENTICAÇÃO');
    let token;
    try {
      const login = await axios.post(`${baseUrl}/auth/login`, {
        email: 'brunadevv@gmail.com',
        password: 'admin123'
      });
      token = login.data.token;
      logTest('Login admin', login.data.success);
    } catch (error) {
      logTest('Login admin', false, error.response?.data?.message || error.message);
      return;
    }

    // 3. Testar criação de usuário moderador
    console.log('\n3. 👤 CRIAÇÃO DE USUÁRIO MODERADOR');
    let moderatorId;
    try {
      const createUser = await axios.post(`${baseUrl}/users`, {
        name: 'Moderador Teste Final',
        email: 'moderador.final@teste.com',
        password: 'Teste@123',
        role: 'moderator'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      moderatorId = createUser.data.data?.id;
      logTest('Criação usuário moderador',
        createUser.data.success && createUser.data.data.role === 'moderator',
        `Role salva: ${createUser.data.data?.role}`
      );
    } catch (error) {
      logTest('Criação usuário moderador', false,
        error.response?.data?.message || error.message);
    }

    // 4. Testar listagem de usuários (verificação visual)
    console.log('\n4. 📋 LISTAGEM DE USUÁRIOS');
    try {
      const listUsers = await axios.get(`${baseUrl}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const moderatorUser = listUsers.data.users?.find(u => u.email === 'moderador.final@teste.com');
      logTest('Usuário moderador na listagem',
        moderatorUser && moderatorUser.role === 'moderator',
        `Encontrado: ${moderatorUser ? 'Sim' : 'Não'}, Role: ${moderatorUser?.role}`
      );
    } catch (error) {
      logTest('Usuário moderador na listagem', false,
        error.response?.data?.message || error.message);
    }

    // 5. Testar endpoints do moderador
    console.log('\n5. ⚙️ ENDPOINTS DO MODERADOR');
    try {
      // Criar token para moderador (simular)
      const modLogin = await axios.post(`${baseUrl}/auth/login`, {
        email: 'moderador.final@teste.com',
        password: 'Teste@123'
      });

      if (modLogin.data.success) {
        const modToken = modLogin.data.token;

        // Testar stats
        const stats = await axios.get(`${baseUrl}/moderator/stats`, {
          headers: { 'Authorization': `Bearer ${modToken}` }
        });
        logTest('Endpoint /moderator/stats',
          stats.data.success,
          `Agendamentos hoje: ${stats.data.data?.total_today || 0}`
        );

        // Testar configurações
        const settings = await axios.get(`${baseUrl}/moderator/settings`, {
          headers: { 'Authorization': `Bearer ${modToken}` }
        });
        logTest('Endpoint /moderator/settings', settings.data.success);

        // Testar atualização de configurações
        const updateSettings = await axios.put(`${baseUrl}/moderator/settings`, {
          company_name: 'Empresa Teste',
          services: ['Corte', 'Escova', 'Coloração']
        }, {
          headers: {
            'Authorization': `Bearer ${modToken}`,
            'Content-Type': 'application/json'
          }
        });
        logTest('Atualização de configurações',
          updateSettings.data.success,
          `Empresa: ${updateSettings.data.data?.company_name}`
        );

      } else {
        logTest('Login moderador', false, 'Não conseguiu fazer login');
      }
    } catch (error) {
      logTest('Endpoints do moderador', false,
        error.response?.data?.message || error.message);
    }

    // 6. Testar informações públicas da empresa
    console.log('\n6. 🏢 INFORMAÇÕES PÚBLICAS DA EMPRESA');
    try {
      const companyInfo = await axios.get(`${baseUrl}/moderator/company-info`);
      logTest('Endpoint /moderator/company-info',
        companyInfo.data.success,
        `Empresa: ${companyInfo.data.data?.company_name || 'Não configurada'}`
      );
    } catch (error) {
      logTest('Endpoint /moderator/company-info', false,
        error.response?.data?.message || error.message);
    }

    // 7. Testar criação de agendamento com serviço
    console.log('\n7. 📅 AGENDAMENTO COM SERVIÇO');
    try {
      const appointment = await axios.post(`${baseUrl}/appointments`, {
        customer_name: 'Cliente Moderador',
        customer_phone: '(11) 99999-9999',
        service_type: 'Corte',
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: '15:00',
        duration_minutes: 60
      });

      logTest('Agendamento com serviço',
        appointment.data.success && appointment.data.data.service_type === 'Corte',
        `Protocolo: ${appointment.data.data?.protocol}, Serviço: ${appointment.data.data?.service_type}`
      );
    } catch (error) {
      logTest('Agendamento com serviço', false,
        error.response?.data?.message || error.message);
    }

    // 8. Testar dashboard analytics
    console.log('\n8. 📊 DASHBOARD ANALYTICS');
    try {
      const summary = await axios.get(`${baseUrl}/dashboard/summary`);
      logTest('Endpoint /dashboard/summary', summary.data.success);

      const dailyStats = await axios.get(`${baseUrl}/dashboard/daily-stats`);
      logTest('Endpoint /dashboard/daily-stats', dailyStats.data.success);

      const topServices = await axios.get(`${baseUrl}/dashboard/top-services`);
      logTest('Endpoint /dashboard/top-services', topServices.data.success);
    } catch (error) {
      logTest('Dashboard Analytics', false,
        error.response?.data?.message || error.message);
    }

  } catch (error) {
    console.log(`❌ ERRO GERAL: ${error.message}`);
  }

  // Resultado final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTADO DOS TESTES');
  console.log('='.repeat(60));
  console.log(`✅ Passaram: ${testResults.passed}`);
  console.log(`❌ Falharam: ${testResults.failed}`);
  console.log(`📈 Total: ${testResults.total}`);

  const successRate = (testResults.passed / testResults.total * 100).toFixed(1);
  console.log(`🎯 Taxa de sucesso: ${successRate}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! MODERADOR IMPLEMENTADO COM SUCESSO!');
  } else {
    console.log('\n⚠️ Alguns testes falharam. Verifique os logs acima.');
  }

  console.log('='.repeat(60));
}

testModeratorComplete();


