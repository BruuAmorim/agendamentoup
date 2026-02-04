/**
 * Script para verificar o role de um usuário no banco de dados
 * Uso: node check-user-role.js <email>
 */

const { sequelize } = require('./src/config/database');
const { User } = require('./src/models');

async function checkUserRole(email) {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com banco de dados estabelecida');

    const user = await User.findOne({
      where: {
        email: email.toLowerCase().trim()
      }
    });

    if (!user) {
      console.log(`❌ Usuário com email ${email} não encontrado`);
      return;
    }

    console.log('\n📋 Dados do usuário:');
    console.log('  ID:', user.id);
    console.log('  Nome:', user.name);
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  Role (tipo):', typeof user.role);
    console.log('  Role (trim):', String(user.role).trim());
    console.log('  isActive:', user.isActive);
    console.log('  parent_user_id:', user.parent_user_id);

    if (user.role === 'admin_master') {
      console.log('\n✅ Usuário é ADMIN_MASTER');
    } else if (user.role === 'moderator') {
      console.log('\n⚙️ Usuário é MODERATOR');
    } else {
      console.log('\n👤 Usuário é USER comum');
    }

    await sequelize.close();
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

const email = process.argv[2];
if (!email) {
  console.log('Uso: node check-user-role.js <email>');
  console.log('Exemplo: node check-user-role.js brunadevv@gmail.com');
  process.exit(1);
}

checkUserRole(email);

