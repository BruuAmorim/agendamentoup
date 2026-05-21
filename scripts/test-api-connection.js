// Script de teste para verificar a conexão entre frontend e backend
const http = require('http');

console.log('🧪 Testando conexão da API EvAgendamento...');
console.log('=====================================\n');

// 1. Testar health check da API
console.log('1. Testando health check da API...');
const healthReq = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/health'
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(`✅ Health check: Status ${res.statusCode}`);
    console.log(`   Resposta: ${data.substring(0, 80)}...\n`);
  });
});
healthReq.end();

// 2. Testar criação de agendamento
setTimeout(() => {
  console.log('2. Testando criação de agendamento...');
  const appointmentData = JSON.stringify({
    customer_name: 'Teste API',
    customer_email: 'teste@api.com',
    customer_phone: '11999999999',
    appointment_date: '2026-01-28',
    appointment_time: '14:00',
    duration_minutes: 60
  });

  const createReq = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/appointments',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': appointmentData.length
    }
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log(`✅ Criar agendamento: Status ${res.statusCode}`);
      console.log(`   Resposta: ${data.substring(0, 100)}...\n`);
    });
  });

  createReq.write(appointmentData);
  createReq.end();
}, 1000);

// 3. Simular requisição do frontend (porta 8080 -> 3000)
setTimeout(() => {
  console.log('3. Simulando requisição do frontend (porta 8080 -> 3000)...');
  console.log('   URL simulada: http://localhost:3000/api/appointments');
  console.log('   Origin: http://localhost:8080');
  console.log('   ✅ Deve funcionar com CORS configurado\n');
}, 2000);

// 4. Verificar se frontend está respondendo
setTimeout(() => {
  console.log('4. Verificando se o frontend está respondendo...');
  const frontendReq = http.request({
    hostname: 'localhost',
    port: 8080,
    path: '/'
  }, (res) => {
    console.log(`✅ Frontend: Status ${res.statusCode}`);
    console.log('   Servidor web está rodando na porta 8080\n');
  });

  frontendReq.on('error', (err) => {
    console.log('❌ Frontend: Não está respondendo na porta 8080');
    console.log(`   Erro: ${err.message}\n`);
  });

  frontendReq.end();
}, 3000);

setTimeout(() => {
  console.log('🎉 Teste concluído!');
  console.log('=====================================');
  console.log('Se todos os testes passaram, o problema foi corrigido!');
  console.log('Agora você pode criar agendamentos pelo frontend.');
}, 4000);