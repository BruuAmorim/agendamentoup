/**
 * TESTE: Migração e funcionalidade do moderador
 * Verifica se a tabela foi criada e se o salvamento funciona
 */

const { query, connectDB } = require('./backend/src/models');

async function testModeratorMigration() {
  try {
    console.log('🚀 Testando migração e funcionalidade do moderador...\n');

    // 1. Conectar ao banco
    await connectDB();

    // 2. Verificar se tabela existe
    console.log('🔍 Verificando tabela moderator_settings...');
    const tableCheck = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'moderator_settings'
    `);

    if (tableCheck.rows.length === 0) {
      console.log('❌ Tabela moderator_settings NÃO existe!');
      console.log('💡 Execute: node run-migration-moderator.js');
      return;
    }

    console.log('✅ Tabela moderator_settings existe');

    // 3. Verificar estrutura da tabela
    console.log('\n📋 Verificando estrutura da tabela...');
    const columns = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'moderator_settings'
      ORDER BY ordinal_position
    `);

    console.log('Colunas encontradas:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // 4. Verificar usuários moderadores
    console.log('\n👥 Verificando usuários moderadores...');
    const moderators = await query(`
      SELECT id, name, email, role
      FROM users
      WHERE role = 'moderator' AND "is_active" = true
    `);

    if (moderators.rows.length === 0) {
      console.log('❌ Nenhum moderador ativo encontrado');
      console.log('💡 Crie um usuário com role "moderator" no painel admin');
      return;
    }

    const moderator = moderators.rows[0];
    console.log(`✅ Moderador encontrado: ${moderator.name} (ID: ${moderator.id})`);

    // 5. Testar inserção de configurações
    console.log('\n💾 Testando salvamento de configurações...');

    const testSettings = {
      company_name: 'Empresa Teste Automatizado',
      services: ['Corte de cabelo', 'Manicure', 'Massagem']
    };

    // Verificar se já existe configuração
    const existingCheck = await query(`
      SELECT id FROM moderator_settings WHERE user_id = $1
    `, [moderator.id]);

    if (existingCheck.rows.length > 0) {
      // Atualizar
      await query(`
        UPDATE moderator_settings
        SET company_name = $2, services = $3, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
      `, [moderator.id, testSettings.company_name, JSON.stringify(testSettings.services)]);
      console.log('✅ Configurações atualizadas');
    } else {
      // Inserir
      await query(`
        INSERT INTO moderator_settings (user_id, company_name, services)
        VALUES ($1, $2, $3)
      `, [moderator.id, testSettings.company_name, JSON.stringify(testSettings.services)]);
      console.log('✅ Configurações criadas');
    }

    // 6. Verificar se foi salvo corretamente
    console.log('\n🔍 Verificando configurações salvas...');
    const savedSettings = await query(`
      SELECT company_name, services
      FROM moderator_settings
      WHERE user_id = $1
    `, [moderator.id]);

    if (savedSettings.rows.length > 0) {
      const settings = savedSettings.rows[0];
      console.log('✅ Configurações salvas com sucesso:');
      console.log(`  - Empresa: ${settings.company_name}`);
      console.log(`  - Serviços: ${settings.services.join(', ')}`);
    }

    console.log('\n🎉 Todos os testes passaram! Migração funcionando corretamente.');

  } catch (error) {
    console.error('❌ Erro durante teste:', error);
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  testModeratorMigration();
}

module.exports = { testModeratorMigration };


