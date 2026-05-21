/**
 * Teste para verificar criação de usuário com role moderator
 */

const axios = require('axios');

async function testUserCreation() {
  console.log('🧪 Testando criação de usuário com role MODERATOR...\n');

  const baseUrl = 'http://localhost:3000/api';

  try {
    // 1. Login como admin
    console.log('1. Fazendo login como admin...');
    const loginResponse = await axios.post(`${baseUrl}/auth/login`, {
      email: 'brunadevv@gmail.com',
      password: 'admin123'
    });

    if (!loginResponse.data.success) {
      console.log('❌ Falha no login:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.token;
    console.log('✅ Login realizado com sucesso');

    // 2. Criar usuário com role moderator
    console.log('2. Criando usuário com role MODERATOR...');

    const newUserData = {
      name: 'Moderador Teste',
      email: 'moderador@teste.com',
      password: 'Teste@123',
      role: 'moderator'
    };

    console.log('Enviando dados:', JSON.stringify(newUserData, null, 2));

    const createResponse = await axios.post(`${baseUrl}/users`, newUserData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Resposta do servidor:', JSON.stringify(createResponse.data, null, 2));

    if (createResponse.data.success) {
      console.log('✅ Usuário criado com sucesso!');
      console.log('   ID:', createResponse.data.data.id);
      console.log('   Nome:', createResponse.data.data.name);
      console.log('   Email:', createResponse.data.data.email);
      console.log('   Role:', createResponse.data.data.role);
    } else {
      console.log('❌ Falha na criação:', createResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Erro na requisição:', error.response?.status, error.response?.data || error.message);

    if (error.response?.status === 403) {
      console.log('💡 Erro 403: Verifique se o usuário tem permissões admin_master');
    } else if (error.response?.status === 400) {
      console.log('💡 Erro 400: Verifique se a validação de role está funcionando');
    }
  }
}

testUserCreation();


