/**
 * Teste para verificar se a criação de usuário com role 'moderator' funciona
 */

const axios = require('axios');

async function testModeratorRole() {
  console.log('🧪 Testando criação de usuário com role MODERATOR...\n');

  const baseUrl = 'http://localhost:3000/api';

  // Primeiro, fazer login como admin para obter token
  console.log('1. Fazendo login como admin...');
  try {
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

    // Agora testar criação de usuário com role moderator
    console.log('2. Criando usuário com role MODERATOR...');

    const newUserData = {
      name: 'Moderador Teste',
      email: 'moderador@teste.com',
      password: 'Teste@123',
      role: 'moderator'
    };

    const createResponse = await axios.post(`${baseUrl}/users`, newUserData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (createResponse.data.success) {
      console.log('✅ Usuário moderador criado com sucesso!');
      console.log('   ID:', createResponse.data.data.id);
      console.log('   Nome:', createResponse.data.data.name);
      console.log('   Email:', createResponse.data.data.email);
      console.log('   Role:', createResponse.data.data.role);
    } else {
      console.log('❌ Falha na criação:', createResponse.data.message);
    }

  } catch (error) {
    console.log('❌ Erro na requisição:', error.response?.data || error.message);

    if (error.response?.status === 400) {
      console.log('💡 Isso indica que a validação de role ainda está bloqueando "moderator"');
    }
  }
}

testModeratorRole();


