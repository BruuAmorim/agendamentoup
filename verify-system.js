const axios = require('axios');

async function verifySystem() {
  console.log('🔍 Verificando status do sistema EvAgendamento...\n');

  const urls = [
    { name: 'Backend API', url: 'http://localhost:3000/api/health' },
    { name: 'Frontend', url: 'http://localhost:8080/css/index.html' },
    { name: 'Dashboard Moderador', url: 'http://localhost:8080/moderator.html' },
    { name: 'Dashboard Analytics API', url: 'http://localhost:3000/api/dashboard/summary' }
  ];

  let allWorking = true;

  for (const { name, url } of urls) {
    try {
      console.log(`📡 Testando ${name}...`);
      const response = await axios.get(url, { timeout: 5000 });
      console.log(`✅ ${name}: OK (${response.status})`);
    } catch (error) {
      console.log(`❌ ${name}: FALHA - ${error.code || error.message}`);
      allWorking = false;
    }
  }

  console.log('\n' + '='.repeat(50));

  if (allWorking) {
    console.log('🎉 SISTEMA EVAGENDAMENTO TOTALMENTE OPERACIONAL!');
    console.log('\n🌐 URLs de acesso:');
    console.log('   🔐 Login: http://localhost:8080/css/index.html');
    console.log('   👑 Admin: http://localhost:8080/admin/dashboard');
    console.log('   📅 Usuário: http://localhost:8080/app/agendamentos');
    console.log('   📊 Moderador: http://localhost:8080/moderator.html');
    console.log('\n🔧 API Endpoints:');
    console.log('   📊 Health: http://localhost:3000/api/health');
    console.log('   📈 Dashboard: http://localhost:3000/api/dashboard/summary');
    console.log('   📅 Estatísticas: http://localhost:3000/api/dashboard/daily-stats');
    console.log('\n🔑 Credenciais de teste:');
    console.log('   Admin: brunadevv@gmail.com / admin123');
    console.log('   User: usuarioteste@gmail.com / Mudar@123');
  } else {
    console.log('⚠️ SISTEMA COM PROBLEMAS!');
    console.log('💡 Verifique se as portas 3000 e 8080 estão livres');
    console.log('💡 Execute: ./liberar-porta.bat se necessário');
  }

  console.log('='.repeat(50));
}

verifySystem().catch(console.error);




