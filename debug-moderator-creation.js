/**
 * Debug script para testar criação de usuário moderador
 */

const axios = require('axios');

async function debugModeratorCreation() {
  console.log('🐛 DEBUG - Testando criação de usuário moderador...\n');

  const baseUrl = 'http://localhost:3000/api';

  try {
    // 1. Login como admin
    console.log('1. Fazendo login...');
    const login = await axios.post(`${baseUrl}/auth/login`, {
      email: 'brunadevv@gmail.com',
      password: 'admin123'
    });

    if (!login.data.success) {
      console.log('❌ Falha no login');
      return;
    }

    const token = login.data.token;
    console.log('✅ Login OK');

    // 2. Teste com endpoint de debug
    console.log('\n2. Teste endpoint debug...');
    const debugData = {
      name: 'Teste Debug',
      email: `debug-${Date.now()}@teste.com`,
      password: 'Teste@123',
      role: 'moderator'
    };

    console.log('Enviando:', debugData);

    const debugResponse = await axios.post(`${baseUrl}/users/debug-create`, debugData, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('Recebido no backend:', debugResponse.data.received);

    // 3. Criar usuário real
    console.log('\n3. Criando usuário real...');
    const realData = {
      name: 'Moderador Debug',
      email: `moderador-${Date.now()}@teste.com`,
      password: 'Teste@123',
      role: 'moderator'
    };

    console.log('Enviando:', realData);

    const createResponse = await axios.post(`${baseUrl}/users`, realData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Resposta criação:', createResponse.data);

    if (createResponse.data.success) {
      console.log('✅ Usuário criado!');
      console.log('   Role retornada:', createResponse.data.data.role);

      if (createResponse.data.data.role === 'moderator') {
        console.log('🎉 SUCESSO! Role foi persistida corretamente!');
      } else {
        console.log('❌ PROBLEMA! Role foi salva como:', createResponse.data.data.role);
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error.response?.status, error.response?.data || error.message);
  }
}

debugModeratorCreation();


