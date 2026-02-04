const axios = require('axios');

async function checkSystemStatus() {
  console.log('🔍 Verificando status completo do sistema EvAgendamento...\n');

  const endpoints = [
    { name: 'Backend API', url: 'http://localhost:3000/api/health' },
    { name: 'Frontend Login', url: 'http://localhost:8080/css/index.html' },
    { name: 'Dashboard Moderador', url: 'http://localhost:8080/moderator.html' },
    { name: 'Dashboard Analytics', url: 'http://localhost:3000/api/dashboard/summary' },
    { name: 'API Moderador', url: 'http://localhost:3000/api/moderator/company-info' }
  ];

  let working = 0;
  let total = endpoints.length;

  for (const { name, url } of endpoints) {
    try {
      const response = await axios.get(url, { timeout: 5000 });
      console.log(`✅ ${name}: OK (${response.status})`);
      working++;
    } catch (error) {
      console.log(`❌ ${name}: FALHA - ${error.code || 'Erro desconhecido'}`);
    }
  }

  console.log(`\n📊 Status: ${working}/${total} serviços funcionando`);

  if (working === total) {
    console.log('\n🎉 SISTEMA EVAGENDAMENTO TOTALMENTE OPERACIONAL!');
    console.log('\n🌐 URLs de acesso:');
    console.log('   🔐 Login: http://localhost:8080/css/index.html');
    console.log('   👑 Admin: http://localhost:8080/admin/dashboard');
    console.log('   📅 Cliente: http://localhost:8080/app/agendamentos');
    console.log('   📊 Moderador: http://localhost:8080/moderator.html');
    console.log('\n🔧 APIs disponíveis:');
    console.log('   📈 Dashboard: http://localhost:3000/api/dashboard/summary');
    console.log('   👤 Moderador: http://localhost:3000/api/moderator/stats');
    console.log('\n🔑 Credenciais de teste:');
    console.log('   Admin: brunadevv@gmail.com / admin123');
    console.log('   User: usuarioteste@gmail.com / Mudar@123');
    console.log('\n⚡ Funcionalidades ativas:');
    console.log('   • Protocolos curtos (AG-XXXX)');
    console.log('   • Perfil Moderador completo');
    console.log('   • Dashboard Analytics');
    console.log('   • Gestão de empresa e serviços');
  } else {
    console.log('\n⚠️ SISTEMA COM PROBLEMAS!');
    console.log('💡 Verifique se as portas 3000 e 8080 estão livres');
    console.log('💡 Execute novamente: ./start-system.bat');
  }

  console.log('\n' + '='.repeat(60));
}

checkSystemStatus().catch(console.error);


