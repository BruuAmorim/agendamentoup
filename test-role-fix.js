/**
 * Teste para verificar se a correção da role moderator funcionou
 */

const axios = require('axios');

async function testRoleFix() {
  console.log('🧪 Testando correção da role MODERATOR...\n');

  const baseUrl = 'http://localhost:3000/api';

  try {
    // 1. Login como admin
    console.log('1. Fazendo login como admin...');
    const login = await axios.post(`${baseUrl}/auth/login`, {
      email: 'brunadevv@gmail.com',
      password: 'admin123'
    });

    if (!login.data.success) {
      console.log('❌ Falha no login:', login.data.message);
      return;
    }

    const token = login.data.token;
    console.log('✅ Login realizado');

    // 2. Teste com endpoint de debug
    console.log('2. Testando endpoint de debug...');
    const debugResponse = await axios.post(`${baseUrl}/users/debug-create`, {
      name: 'Teste Debug',
      email: 'debug@teste.com',
      password: 'Teste@123',
      role: 'moderator'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📨 Dados recebidos no backend:', debugResponse.data.received);
    console.log('🔑 Autorização presente:', debugResponse.data.headers.authorization);

    // 3. Criar usuário real
    console.log('3. Criando usuário real com role MODERATOR...');
    const createResponse = await axios.post(`${baseUrl}/users`, {
      name: 'Moderador Real',
      email: 'moderador.real@teste.com',
      password: 'Teste@123',
      role: 'moderator'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (createResponse.data.success) {
      console.log('✅ Usuário criado!');
      console.log('   Role retornada:', createResponse.data.data.role);

      if (createResponse.data.data.role === 'moderator') {
        console.log('🎉 SUCESSO! Role MODERATOR foi persistida corretamente!');
      } else {
        console.log('❌ PROBLEMA! Role foi salva como:', createResponse.data.data.role);
      }
    } else {
      console.log('❌ Falha na criação:', createResponse.data.message);
    }

    // 4. Verificar na listagem
    console.log('4. Verificando na listagem de usuários...');
    const listResponse = await axios.get(`${baseUrl}/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const moderatorUser = listResponse.data.users?.find(u => u.email === 'moderador.real@teste.com');
    if (moderatorUser) {
      console.log('📋 Usuário encontrado na listagem:');
      console.log('   Role no banco:', moderatorUser.role);

      if (moderatorUser.role === 'moderator') {
        console.log('🎉 TOTALMENTE FUNCIONAL! Role está correta no banco!');
      } else {
        console.log('❌ INCONSISTÊNCIA! Role no banco está errada!');
      }
    } else {
      console.log('❌ Usuário não encontrado na listagem');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.status, error.response?.data || error.message);
  }
}

testRoleFix();


